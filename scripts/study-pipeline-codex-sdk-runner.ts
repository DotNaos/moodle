#!/usr/bin/env bun

import path from "node:path";

type CodexSDKRunnerRequest = {
  prompt?: unknown;
  model?: unknown;
  reasoningEffort?: unknown;
  workingDirectory?: unknown;
  imagePaths?: unknown;
  outputSchema?: unknown;
  apiKey?: unknown;
  baseUrl?: unknown;
  codexPath?: unknown;
};

type CodexSDKRunnerResponse = {
  finalResponse: string;
  threadId: string | null;
  usage: unknown;
};

const reasoningEfforts = new Set(["minimal", "low", "medium", "high", "xhigh"]);

if (process.argv.includes("--self-test")) {
  await runSelfTest();
  process.exit(0);
}

try {
  const request = parseRequest(await readStdin());
  const response = await runCodexSDK(request);
  process.stdout.write(`${JSON.stringify(response)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

async function runCodexSDK(request: RequiredCodexSDKRunnerRequest): Promise<CodexSDKRunnerResponse> {
  const mockResponse = process.env.MOODLE_CODEX_SDK_MOCK_RESPONSE;
  if (mockResponse !== undefined) {
    return {
      finalResponse: mockResponse,
      threadId: "mock-codex-sdk-thread",
      usage: null,
    };
  }

  const { Codex } = await import("@openai/codex-sdk");
  const codex = new Codex({
    apiKey: optionalString(request.apiKey),
    baseUrl: optionalString(request.baseUrl),
    codexPathOverride: optionalString(request.codexPath),
  });
  const thread = codex.startThread({
    approvalPolicy: "never",
    model: request.model,
    modelReasoningEffort: normalizeReasoningEffort(request.reasoningEffort),
    sandboxMode: "read-only",
    skipGitRepoCheck: true,
    workingDirectory: request.workingDirectory,
  });
  const turn = await thread.run(buildCodexInput(request), {
    outputSchema: request.outputSchema,
  });
  return {
    finalResponse: turn.finalResponse,
    threadId: thread.id,
    usage: turn.usage,
  };
}

type RequiredCodexSDKRunnerRequest = {
  prompt: string;
  model: string;
  reasoningEffort?: string;
  workingDirectory: string;
  imagePaths: string[];
  outputSchema?: unknown;
  apiKey?: string;
  baseUrl?: string;
  codexPath?: string;
};

function parseRequest(raw: string): RequiredCodexSDKRunnerRequest {
  let payload: CodexSDKRunnerRequest;
  try {
    payload = JSON.parse(raw) as CodexSDKRunnerRequest;
  } catch (error) {
    throw new Error(`SDK runner input must be JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const prompt = requiredString(payload.prompt, "prompt");
  const model = requiredString(payload.model, "model");
  const workingDirectory = requiredString(payload.workingDirectory, "workingDirectory");
  const imagePaths = Array.isArray(payload.imagePaths)
    ? payload.imagePaths.flatMap((value) => {
        const resolved = optionalString(value);
        return resolved ? [resolved] : [];
      })
    : [];

  return {
    prompt,
    model,
    reasoningEffort: optionalString(payload.reasoningEffort),
    workingDirectory,
    imagePaths,
    outputSchema: payload.outputSchema,
    apiKey: optionalString(payload.apiKey),
    baseUrl: optionalString(payload.baseUrl),
    codexPath: optionalString(payload.codexPath),
  };
}

function buildCodexInput(request: RequiredCodexSDKRunnerRequest) {
  if (request.imagePaths.length === 0) {
    return request.prompt;
  }
  return [
    { type: "text" as const, text: request.prompt },
    ...request.imagePaths.map((imagePath) => ({ type: "local_image" as const, path: imagePath })),
  ];
}

function normalizeReasoningEffort(value?: string) {
  if (!value) {
    return undefined;
  }
  return reasoningEfforts.has(value) ? value as "minimal" | "low" | "medium" | "high" | "xhigh" : undefined;
}

function requiredString(value: unknown, label: string): string {
  const text = optionalString(value);
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readStdin(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) {
    input += String(chunk);
  }
  return input;
}

async function runSelfTest() {
  if (process.env.MOODLE_CODEX_SDK_MOCK_RESPONSE === undefined) {
    throw new Error("self-test requires MOODLE_CODEX_SDK_MOCK_RESPONSE");
  }
  const response = await runCodexSDK(parseRequest(JSON.stringify({
    prompt: "Return the provided JSON.",
    model: "gpt-test",
    reasoningEffort: "high",
    workingDirectory: path.resolve("."),
    imagePaths: [],
    outputSchema: { type: "object", additionalProperties: false, properties: { ok: { type: "boolean" } }, required: ["ok"] },
  })));
  if (response.finalResponse !== process.env.MOODLE_CODEX_SDK_MOCK_RESPONSE) {
    throw new Error("mock response was not returned");
  }
  const sdk = await import("@openai/codex-sdk");
  if (typeof sdk.Codex !== "function") {
    throw new Error("@openai/codex-sdk package was not resolvable");
  }
  console.log("codex sdk runner self-test ok");
}
