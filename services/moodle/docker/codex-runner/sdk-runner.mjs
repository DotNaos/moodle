#!/usr/bin/env node

import path from "node:path";
import { Codex } from "@openai/codex-sdk";

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

async function runCodexSDK(request) {
  const mockResponse = process.env.MOODLE_CODEX_SDK_MOCK_RESPONSE;
  if (mockResponse !== undefined) {
    return {
      finalResponse: mockResponse,
      threadId: "mock-codex-sdk-thread",
      usage: null,
    };
  }

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

function parseRequest(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`SDK runner input must be JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    prompt: requiredString(payload.prompt, "prompt"),
    model: requiredString(payload.model, "model"),
    reasoningEffort: optionalString(payload.reasoningEffort),
    workingDirectory: requiredString(payload.workingDirectory, "workingDirectory"),
    imagePaths: Array.isArray(payload.imagePaths) ? payload.imagePaths.flatMap((value) => optionalString(value) ? [optionalString(value)] : []) : [],
    outputSchema: payload.outputSchema,
    apiKey: optionalString(payload.apiKey),
    baseUrl: optionalString(payload.baseUrl),
    codexPath: optionalString(payload.codexPath),
  };
}

function buildCodexInput(request) {
  if (request.imagePaths.length === 0) {
    return request.prompt;
  }
  return [
    { type: "text", text: request.prompt },
    ...request.imagePaths.map((imagePath) => ({ type: "local_image", path: imagePath })),
  ];
}

function normalizeReasoningEffort(value) {
  return value && reasoningEfforts.has(value) ? value : undefined;
}

function requiredString(value, label) {
  const text = optionalString(value);
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readStdin() {
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
  if (typeof Codex !== "function") {
    throw new Error("@openai/codex-sdk package was not resolvable");
  }
  console.log("codex sdk runner self-test ok");
}
