import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_WEB_URL = "https://moodle.os-home.net";
export const DEFAULT_SERVICES_URL = "https://moodle-services.os-home.net";
export const CACHE_PATH = path.join(homedir(), ".moodle", "pipeline-api-key.json");

const LOCAL_MOODLE_CONFIG_PATH = path.join(homedir(), ".moodle", "config.json");
const STAGES = ["inventory", "raw", "extracted", "curated"] as const;

type Stage = (typeof STAGES)[number];
type RunMode = "from" | "single";
export type JsonObject = Record<string, unknown>;

type Credentials = {
  apiKey: string;
  clerkUserId: string;
  servicesUrl?: string;
  source: "cache" | "env";
};

type CachedCredentials = {
  apiKey?: string;
  clerkUserId?: string;
  servicesUrl?: string;
};

type MoodleConfig = {
  username?: string;
  password?: string;
};

export type CommonOptions = {
  directServices?: boolean;
  web?: string;
  services?: string;
  raw?: boolean;
  timeoutMs?: string;
};

const stageAliases = new Map<string, Stage>([
  ["resources", "inventory"],
  ["resource-set", "inventory"],
  ["raw-import", "raw"],
  ["raw_import", "raw"],
  ["extraction", "extracted"],
  ["extract", "extracted"],
  ["ocr", "extracted"],
  ["codex", "curated"],
  ["curation", "curated"],
  ["curated-ready", "curated"],
]);

export async function pipelineRequest(input: {
  body?: unknown;
  method: string;
  options: CommonOptions;
  path: string;
}) {
  const credentials = await loadCredentials({ required: true });
  const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = input.options.directServices
    ? new URL(`/api${normalizedPath}`, resolveServicesUrl(input.options))
    : new URL(`/api/study-pipeline${normalizedPath}`, resolveWebUrl(input.options));
  const response = await fetch(url, {
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Clerk-User-Id": credentials.clerkUserId,
      "X-Moodle-App-Key": credentials.apiKey,
    },
    method: input.method,
    signal: AbortSignal.timeout(resolveTimeoutMs(input.options)),
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const detail = String(payload.error ?? payload.message ?? response.statusText);
    throw new Error(`Pipeline API ${input.method} ${url.pathname} failed with ${response.status}: ${detail}`);
  }
  return payload;
}

export async function serviceJSON(url: string, init: RequestInit): Promise<JsonObject> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(60000),
    ...init,
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(`Moodle services request failed with ${response.status}: ${String(payload.error ?? payload.message ?? response.statusText)}`);
  }
  return payload;
}

export async function loadCredentials({ required }: { required: boolean }): Promise<Credentials | null> {
  const envKey = process.env.MOODLE_PIPELINE_API_KEY?.trim();
  const envClerk = process.env.MOODLE_PIPELINE_CLERK_USER_ID?.trim() ?? "";
  if (envKey) {
    return { apiKey: envKey, clerkUserId: envClerk, source: "env" };
  }
  const cached = await readCache();
  if (cached?.apiKey) {
    return {
      apiKey: cached.apiKey,
      clerkUserId: process.env.MOODLE_PIPELINE_CLERK_USER_ID?.trim() || cached.clerkUserId || "",
      servicesUrl: cached.servicesUrl,
      source: "cache",
    };
  }
  if (!required) {
    return null;
  }
  throw new Error("No pipeline API key found. Run auth restore/login or set MOODLE_PIPELINE_API_KEY.");
}

export async function saveCredentials(input: { apiKey: string; clerkUserId: string; servicesUrl: string }) {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify({
    apiKey: input.apiKey,
    clerkUserId: input.clerkUserId,
    createdAt: new Date().toISOString(),
    servicesUrl: input.servicesUrl,
  }, null, 2));
  await chmod(CACHE_PATH, 0o600);
}

export function collectOption(value: string, previous: string[] = []) {
  return [...previous, value];
}

export function requiredOptionOrEnv(value: string | undefined, label: string, envName: string): string {
  const resolved = value ?? process.env[envName];
  if (!resolved?.trim()) {
    throw new Error(`Missing ${label} or ${envName}.`);
  }
  return resolved.trim();
}

export function listFlags(values: string[]) {
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveWebUrl(options: CommonOptions) {
  return String(options.web ?? process.env.MOODLE_PIPELINE_WEB_URL ?? process.env.MOODLE_WEB_URL ?? DEFAULT_WEB_URL).replace(/\/+$/, "");
}

export function resolveServicesUrl(options: CommonOptions) {
  return String(options.services ?? process.env.MOODLE_SERVICES_URL ?? DEFAULT_SERVICES_URL).replace(/\/+$/, "");
}

export function normalizeStage(stage: string): Stage {
  const value = stage.trim().toLowerCase();
  const normalized = stageAliases.get(value) ?? value;
  if (!isStage(normalized)) {
    throw new Error(`Unknown stage "${stage}". Use one of: ${STAGES.join(", ")}.`);
  }
  return normalized;
}

export function normalizeMode(mode: string): RunMode {
  const normalized = mode.trim().toLowerCase();
  if (normalized !== "from" && normalized !== "single") {
    throw new Error('Unknown mode. Use "from" or "single".');
  }
  return normalized;
}

export function readLocalMoodleConfig(): MoodleConfig | null {
  if (!existsSync(LOCAL_MOODLE_CONFIG_PATH)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(LOCAL_MOODLE_CONFIG_PATH, "utf8")) as MoodleConfig;
  } catch {
    return null;
  }
}

export function parseJSON(value: string, label: string) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function removeUndefined(input: JsonObject) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function collectRuns(payload: unknown) {
  const runs: JsonObject[] = [];
  visit(payload, (value) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as JsonObject).status === "string" &&
      ("stage" in value || "artifactRoot" in value)
    ) {
      runs.push(value as JsonObject);
    }
  });
  return runs;
}

export function collectStrings(payload: unknown, needle: string) {
  const matches: string[] = [];
  visit(payload, (value) => {
    if (typeof value === "string" && value.toLowerCase().includes(needle)) {
      matches.push(value);
    }
  });
  return matches;
}

export function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function printJSON(payload: unknown, options: CommonOptions) {
  if (options.raw) {
    process.stdout.write(typeof payload === "string" ? payload : JSON.stringify(payload));
    return;
  }
  process.stdout.write(`${JSON.stringify(redactPayload(payload), null, 2)}\n`);
}

export function redact(value: string, keep = 4) {
  if (!value) {
    return "";
  }
  if (value.length <= keep * 2) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export function printError(error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
}

export function runSelfTest() {
  const resources = listFlags(["1", "2,3"]);
  if (JSON.stringify(resources) !== JSON.stringify(["1", "2", "3"])) {
    throw new Error("resource parser failed");
  }
  if (normalizeStage("ocr") !== "extracted") {
    throw new Error("stage alias failed");
  }
  if (normalizeMode("single") !== "single") {
    throw new Error("mode parser failed");
  }
  const redacted = redactPayload({ url: "https://example.test/file?token=secret&x=1", apiKey: "secret" }) as JsonObject;
  if (String(redacted.url).includes("secret") || redacted.apiKey !== "[redacted]") {
    throw new Error("redaction failed");
  }
  console.log("self-test ok");
}

async function parseResponse(response: Response): Promise<JsonObject> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json() as JsonObject;
  }
  return { text: await response.text() };
}

async function readCache(): Promise<CachedCredentials | null> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")) as CachedCredentials;
  } catch {
    return null;
  }
}

function resolveTimeoutMs(options: CommonOptions) {
  const value = Number.parseInt(String(options.timeoutMs ?? "60000"), 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--timeout-ms must be a positive integer.");
  }
  return value;
}

function isStage(value: string): value is Stage {
  return STAGES.includes(value as Stage);
}

function visit(value: unknown, fn: (value: unknown) => void) {
  fn(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, fn);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visit(item, fn);
    }
  }
}

function redactPayload(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (isSensitiveKey(key)) {
      return "[redacted]";
    }
    return redactURLSecrets(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPayload(item, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactPayload(entryValue, entryKey),
    ]));
  }
  return value;
}

function isSensitiveKey(key: string) {
  return /^(apiKey|password|secret|token|authorization)$/i.test(key);
}

function redactURLSecrets(value: string) {
  try {
    const url = new URL(value);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret|password|signature|sig/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
        changed = true;
      }
    }
    return changed ? url.toString() : value;
  } catch {
    return value.replace(/([?&](?:token|key|secret|password|signature|sig)=)[^&#\s]+/gi, "$1[redacted]");
  }
}
