#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";

type CacheEntry = {
  status: "free" | "taken" | "unknown" | "rate_limited" | "error";
  detail?: string;
  checkedAt: string;
};

type Cache = Record<string, CacheEntry>;

type Candidate = {
  name: string;
  score: number;
  pattern: string;
};

type Checks = {
  githubUser?: CacheEntry;
  githubOrg?: CacheEntry;
  npm?: CacheEntry;
  domains: Record<string, CacheEntry>;
};

type Options = {
  min: string;
  max: string;
  patterns: string;
  names?: string;
  limit: string;
  take: string;
  rawAll: boolean;
  check: "none" | "registries" | "domains" | "all";
  domains: string;
  delayMs: string;
  cache: string;
  markdown: boolean;
  requireDomain: boolean;
};

const repoRoot = path.resolve(import.meta.dirname, "..");
const defaultCachePath = path.join(repoRoot, ".verification", "name-scan-cache.json");

const vowels = ["a", "e", "i", "o", "u", "y"];
const softVowels = new Set(["a", "e", "i", "o"]);
const consonants = [
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  "m",
  "n",
  "p",
  "q",
  "r",
  "s",
  "t",
  "v",
  "w",
  "x",
  "z",
];
const preferredLetters = new Set(["n", "o", "t", "z", "v", "l", "r", "m", "f", "g", "y"]);
const harshPairs = ["qx", "xq", "jq", "qj", "ww", "yy", "hh", "jj", "qq", "xx"];
const allowedFinalClusters = new Set([
  "ld",
  "lk",
  "lm",
  "ln",
  "lp",
  "lt",
  "nd",
  "nk",
  "nt",
  "rd",
  "rk",
  "rn",
  "rt",
  "sk",
  "st",
  "th",
]);
const strongStarts = ["no", "ne", "na", "ni", "ze", "zo", "za"];
const usefulStarts = ["ve", "vi", "vo", "gl", "gy", "tr", "re", "me", "fo"];
const rootFragments = ["not", "nod", "nor", "nex", "lex", "mem", "rem", "fol", "gly", "tr", "mark"];
const goodEndings = ["o", "a", "y", "n", "r", "v", "l"];

const program = new Command()
  .name("name-scan")
  .description("Generate short brand-name candidates and optionally check obvious availability.")
  .option("--min <n>", "Minimum candidate length.", "3")
  .option("--max <n>", "Maximum candidate length.", "4")
  .option(
    "--patterns <list>",
    "Comma-separated pattern list using c=consonant and v=vowel.",
    "cvc,cvv,cvcv,cvvc,cvcc,ccvc",
  )
  .option("--names <list>", "Comma-separated explicit names to score/check instead of generating candidates.")
  .option("--limit <n>", "Maximum generated candidates before availability checks.", "200")
  .option("--take <n>", "Rows to print after scoring/filtering.", "50")
  .option("--raw-all", "Generate all a-z combinations for the requested lengths instead of pattern-based names.", false)
  .option("--check <mode>", "Availability mode: none, registries, domains, all.", "none")
  .option("--domains <list>", "Comma-separated TLDs to check.", "com,app,dev,io")
  .option("--delay-ms <n>", "Delay between network checks.", "750")
  .option("--cache <path>", "Cache path for availability checks.", defaultCachePath)
  .option("--no-markdown", "Print TSV instead of a Markdown table.")
  .option("--require-domain", "Only print checked candidates with at least one free domain.", false);

program.parse();
const options = program.opts<Options>();

main(options).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main(opts: Options) {
  const minLength = parsePositiveInt(opts.min, "--min");
  const maxLength = parsePositiveInt(opts.max, "--max");
  const generatedLimit = parsePositiveInt(opts.limit, "--limit");
  const take = parsePositiveInt(opts.take, "--take");
  const delayMs = parsePositiveInt(opts.delayMs, "--delay-ms");
  const checkMode = parseCheckMode(opts.check);
  const tlds = splitList(opts.domains).map((tld) => tld.replace(/^\./, ""));
  const cachePath = path.resolve(opts.cache);

  if (minLength > maxLength) {
    throw new Error("--min must be less than or equal to --max.");
  }

  const candidates = (opts.names
    ? splitList(opts.names).map((name) => ({ name: name.toLowerCase(), score: 0, pattern: "explicit" }))
    : generateCandidates({
      minLength,
      maxLength,
      patterns: splitList(opts.patterns),
      rawAll: opts.rawAll,
    }))
    .filter((candidate) => /^[a-z]{1,63}$/.test(candidate.name) && (opts.names || isAllowed(candidate.name)))
    .map((candidate) => ({ ...candidate, score: scoreName(candidate.name, candidate.pattern) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, generatedLimit);

  if (checkMode === "none") {
    printRows(candidates.slice(0, take), new Map(), opts.markdown);
    return;
  }

  const cache = await loadCache(cachePath);
  const checksByName = new Map<string, Checks>();

  for (const candidate of candidates) {
    const checks = await checkCandidate(candidate.name, {
      cache,
      checkMode,
      delayMs,
      tlds,
    });
    checksByName.set(candidate.name, checks);
  }

  await saveCache(cachePath, cache);

  const rows = candidates
    .filter((candidate) => {
      if (!opts.requireDomain) return true;
      const checks = checksByName.get(candidate.name);
      return checks ? Object.values(checks.domains).some((entry) => entry.status === "free") : false;
    })
    .slice(0, take);

  printRows(rows, checksByName, opts.markdown);
}

function generateCandidates(args: {
  minLength: number;
  maxLength: number;
  patterns: string[];
  rawAll: boolean;
}): Candidate[] {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  if (args.rawAll) {
    for (let length = args.minLength; length <= args.maxLength; length += 1) {
      for (const name of generateRaw(length)) {
        if (seen.has(name)) continue;
        seen.add(name);
        candidates.push({ name, score: 0, pattern: "raw" });
      }
    }
    return candidates;
  }

  for (const pattern of args.patterns) {
    if (pattern.length < args.minLength || pattern.length > args.maxLength) continue;
    for (const name of expandPattern(pattern)) {
      if (seen.has(name)) continue;
      seen.add(name);
      candidates.push({ name, score: 0, pattern });
    }
  }

  return candidates;
}

function* generateRaw(length: number): Generator<string> {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const total = alphabet.length ** length;
  for (let index = 0; index < total; index += 1) {
    let value = index;
    let name = "";
    for (let position = 0; position < length; position += 1) {
      name = alphabet[value % alphabet.length] + name;
      value = Math.floor(value / alphabet.length);
    }
    yield name;
  }
}

function expandPattern(pattern: string): string[] {
  let names = [""];
  for (const token of pattern) {
    const choices = token === "v" ? vowels : token === "c" ? consonants : [token];
    names = names.flatMap((prefix) => choices.map((choice) => `${prefix}${choice}`));
  }
  return names;
}

function isAllowed(name: string): boolean {
  if (!/^[a-z]{3,6}$/.test(name)) return false;
  if (!/[aeiouy]/.test(name)) return false;
  if (/(.)\1\1/.test(name)) return false;
  if (harshPairs.some((pair) => name.includes(pair))) return false;
  if (/^[qx]/.test(name)) return false;
  if (/[bcdfghjklmnpqrstvwxz]{2}$/.test(name)) {
    const cluster = name.slice(-2);
    if (!allowedFinalClusters.has(cluster)) return false;
  }
  if (/[bcdfghjklmnpqrstvwxz]{4}/.test(name)) return false;
  if (/[aeiouy]{3}/.test(name)) return false;
  return true;
}

function scoreName(name: string, pattern: string): number {
  let score = 0;
  score += 20 - name.length * 2;
  score += preferredLetters.has(name[0] ?? "") ? 3 : 0;
  score += goodEndings.includes(name.at(-1) ?? "") ? 3 : 0;
  score += strongStarts.some((start) => name.startsWith(start)) ? 7 : 0;
  score += usefulStarts.some((start) => name.startsWith(start)) ? 3 : 0;
  score += rootFragments.some((fragment) => name.includes(fragment)) ? 5 : 0;
  score += /z/.test(name) ? 1 : 0;
  score += pattern === "cvcv" ? 3 : 0;
  score += pattern === "cvvc" ? 1 : 0;
  score += softVowels.has(name[1] ?? "") ? 2 : 0;
  score -= /[jqw]/.test(name) ? 2 : 0;
  score -= /[qx]/.test(name) ? 2 : 0;
  score -= name.endsWith("x") ? 3 : 0;
  score -= /(.)\1/.test(name) ? 2 : 0;
  return score;
}

async function checkCandidate(
  name: string,
  args: { cache: Cache; checkMode: "registries" | "domains" | "all"; delayMs: number; tlds: string[] },
): Promise<Checks> {
  const checks: Checks = { domains: {} };

  if (args.checkMode === "registries" || args.checkMode === "all") {
    checks.githubUser = await cachedCheck(args.cache, `github-user:${name}`, args.delayMs, () =>
      checkURL(`https://api.github.com/users/${name}`),
    );
    checks.githubOrg = await cachedCheck(args.cache, `github-org:${name}`, args.delayMs, () =>
      checkURL(`https://api.github.com/orgs/${name}`),
    );
    checks.npm = await cachedCheck(args.cache, `npm:${name}`, args.delayMs, () =>
      checkURL(`https://registry.npmjs.org/${encodeURIComponent(name)}`),
    );
  }

  if (args.checkMode === "domains" || args.checkMode === "all") {
    for (const tld of args.tlds) {
      const domain = `${name}.${tld}`;
      checks.domains[tld] = await cachedCheck(args.cache, `domain:${domain}`, args.delayMs, () =>
        checkURL(`https://rdap.org/domain/${domain}`),
      );
    }
  }

  return checks;
}

async function checkURL(url: string): Promise<CacheEntry> {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "moodle-clients-name-scan",
    },
  }).catch((error) => {
    return { error } as const;
  });

  const checkedAt = new Date().toISOString();
  if ("error" in response) {
    return { status: "error", detail: String(response.error), checkedAt };
  }
  if (response.status === 404) return { status: "free", checkedAt };
  if (response.status === 429) return { status: "rate_limited", detail: "HTTP 429", checkedAt };
  if (response.ok) return { status: "taken", detail: `HTTP ${response.status}`, checkedAt };
  return { status: "unknown", detail: `HTTP ${response.status}`, checkedAt };
}

async function cachedCheck(
  cache: Cache,
  key: string,
  delayMs: number,
  run: () => Promise<CacheEntry>,
): Promise<CacheEntry> {
  const cached = cache[key];
  if (cached && cached.status !== "rate_limited" && cached.status !== "error") return cached;
  await sleep(delayMs);
  const entry = await run();
  cache[key] = entry;
  return entry;
}

async function loadCache(cachePath: string): Promise<Cache> {
  const raw = await readFile(cachePath, "utf8").catch(() => "");
  if (!raw) return {};
  return JSON.parse(raw) as Cache;
}

async function saveCache(cachePath: string, cache: Cache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function printRows(candidates: Candidate[], checksByName: Map<string, Checks>, markdown: boolean) {
  if (!markdown) {
    console.log(["name", "score", "pattern", "github", "npm", "domains"].join("\t"));
    for (const candidate of candidates) {
      const checks = checksByName.get(candidate.name);
      console.log([
        candidate.name,
        String(candidate.score),
        candidate.pattern,
        registryStatus(checks),
        checks?.npm?.status ?? "",
        domainSummary(checks),
      ].join("\t"));
    }
    return;
  }

  console.log("| Name | Score | Pattern | GitHub | npm | Domains |");
  console.log("|---|---:|---|---|---|---|");
  for (const candidate of candidates) {
    const checks = checksByName.get(candidate.name);
    console.log(
      `| ${candidate.name} | ${candidate.score} | ${candidate.pattern} | ${registryStatus(checks)} | ${
        checks?.npm?.status ?? ""
      } | ${domainSummary(checks)} |`,
    );
  }
}

function registryStatus(checks?: Checks): string {
  if (!checks?.githubUser && !checks?.githubOrg) return "";
  const user = checks.githubUser?.status ?? "";
  const org = checks.githubOrg?.status ?? "";
  return `user:${user} org:${org}`;
}

function domainSummary(checks?: Checks): string {
  if (!checks) return "";
  return Object.entries(checks.domains)
    .map(([tld, entry]) => `.${tld}:${entry.status}`)
    .join(" ");
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseCheckMode(value: string): "none" | "registries" | "domains" | "all" {
  if (value === "none" || value === "registries" || value === "domains" || value === "all") {
    return value;
  }
  throw new Error("--check must be one of: none, registries, domains, all.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
