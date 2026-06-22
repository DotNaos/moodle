#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command, Option } from "commander";
import {
  CACHE_PATH,
  collectOption,
  collectRuns,
  collectStrings,
  countBy,
  DEFAULT_SERVICES_URL,
  DEFAULT_WEB_URL,
  listFlags,
  loadCredentials,
  normalizeMode,
  normalizeStage,
  parseJSON,
  pipelineRequest,
  printError,
  printJSON,
  readLocalMoodleConfig,
  redact,
  removeUndefined,
  requiredOptionOrEnv,
  resolveServicesUrl,
  resolveWebUrl,
  runSelfTest,
  saveCredentials,
  serviceJSON,
  type CommonOptions,
} from "./study-pipeline-cli-core";
import {
  buildTaskSheetReadinessReportFromArtifactRoot,
  buildTaskSheetReadinessReport,
  runReadinessSelfTest,
} from "./study-pipeline-readiness";
import { promoteCurationToImprovedArtifact, runPromotionSelfTest } from "./study-pipeline-curation-promote";

type CourseOptions = CommonOptions & {
  course: string;
};

type AuthOptions = CommonOptions & {
  clerkUserId?: string;
  internalSecret?: string;
  username?: string;
};

type RunOptions = CourseOptions & {
  start?: string;
  stage?: string;
  mode?: string;
  resource?: string[];
  resources?: string[];
  engine?: string;
  config?: string;
  model?: string;
  reasoningEffort?: string;
};

type RequestOptions = CommonOptions & {
  body?: string;
};

type VerifyOptions = CourseOptions & {
  limit?: string;
};

type ReadinessOptions = CourseOptions & {
  allowBlockers?: string;
  artifactRoot?: string;
  fail?: boolean;
  output?: string;
};

type PromoteCurationOptions = CourseOptions & {
  artifactRoot: string;
  curationFile: string;
  model?: string;
  output?: string;
  resource: string;
};

const program = new Command()
  .name("study-pipeline")
  .description("CLI for Moodle study pipeline auth, runs, and verification.")
  .showHelpAfterError()
  .option("--web <url>", "Moodle web base URL", DEFAULT_WEB_URL)
  .option("--services <url>", "Moodle services base URL", DEFAULT_SERVICES_URL)
  .option("--direct-services", "Call Moodle services directly instead of the web proxy", false)
  .option("--timeout-ms <ms>", "HTTP request timeout in milliseconds", "60000")
  .option("--raw", "Print raw JSON without secret redaction", false);

const auth = program.command("auth").description("Manage pipeline API credentials.");

auth
  .command("status")
  .description("Show whether a pipeline API key is available.")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<CommonOptions>();
    const credentials = await loadCredentials({ required: false });
    printJSON({
      cachePath: CACHE_PATH,
      clerkUserId: credentials?.clerkUserId ? redact(credentials.clerkUserId, 6) : null,
      hasApiKey: Boolean(credentials?.apiKey),
      source: credentials?.source ?? "missing",
      directServices: Boolean(options.directServices),
      webUrl: resolveWebUrl(options),
      servicesUrl: resolveServicesUrl(options),
    }, options);
  });

auth
  .command("restore")
  .description("Restore a cached app key from an existing backend Clerk session.")
  .option("--clerk-user-id <id>", "Clerk user ID used by the backend. Defaults to MOODLE_PIPELINE_CLERK_USER_ID.")
  .option("--internal-secret <secret>", "Internal web/backend secret. Prefer MOODLE_WEB_INTERNAL_SECRET.")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<AuthOptions>();
    const clerkUserId = requiredOptionOrEnv(options.clerkUserId, "--clerk-user-id", "MOODLE_PIPELINE_CLERK_USER_ID");
    const internalSecret = requiredOptionOrEnv(options.internalSecret, "--internal-secret", "MOODLE_WEB_INTERNAL_SECRET");
    const servicesUrl = resolveServicesUrl(options);
    const payload = await serviceJSON(`${servicesUrl}/api/auth/clerk/session`, {
      headers: {
        "Content-Type": "application/json",
        "X-Clerk-User-Id": clerkUserId,
        "X-Moodle-Internal-Secret": internalSecret,
      },
      method: "POST",
      body: "{}",
    });
    const apiKey = String(payload.apiKey ?? "");
    if (!apiKey) {
      throw new Error(`Backend did not return an API key: ${String(payload.error ?? "unknown error")}`);
    }
    await saveCredentials({ apiKey, clerkUserId, servicesUrl });
    printJSON({ ok: true, cachePath: CACHE_PATH, clerkUserId: redact(clerkUserId, 6) }, options);
  });

auth
  .command("login")
  .description("Login to Moodle through services and cache a pipeline API key.")
  .option("--clerk-user-id <id>", "Clerk user ID used by the backend. Defaults to MOODLE_PIPELINE_CLERK_USER_ID.")
  .option("--internal-secret <secret>", "Internal web/backend secret. Prefer MOODLE_WEB_INTERNAL_SECRET.")
  .option("--username <username>", "Moodle username")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<AuthOptions>();
    const localConfig = readLocalMoodleConfig();
    const clerkUserId = requiredOptionOrEnv(options.clerkUserId, "--clerk-user-id", "MOODLE_PIPELINE_CLERK_USER_ID");
    const internalSecret = requiredOptionOrEnv(options.internalSecret, "--internal-secret", "MOODLE_WEB_INTERNAL_SECRET");
    const username = options.username ?? process.env.MOODLE_USERNAME ?? localConfig?.username;
    const password = process.env.MOODLE_PASSWORD ?? localConfig?.password;
    if (!username || !password) {
      throw new Error("Missing Moodle username/password. Set MOODLE_USERNAME and MOODLE_PASSWORD or keep ~/.moodle/config.json populated.");
    }
    const servicesUrl = resolveServicesUrl(options);
    const payload = await serviceJSON(`${servicesUrl}/api/auth/clerk/login`, {
      headers: {
        "Content-Type": "application/json",
        "X-Clerk-User-Id": clerkUserId,
        "X-Moodle-Internal-Secret": internalSecret,
      },
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const apiKey = String(payload.apiKey ?? "");
    if (!apiKey) {
      throw new Error(`Login did not return an API key: ${String(payload.error ?? "unknown error")}`);
    }
    await saveCredentials({ apiKey, clerkUserId, servicesUrl });
    printJSON({ ok: true, cachePath: CACHE_PATH, clerkUserId: redact(clerkUserId, 6) }, options);
  });

addCourseGetCommand("status", "study-pipeline/status", "Read course pipeline status.");
addCourseGetCommand("inventory", "study-pipeline/inventory", "Read course resource inventory.");
addCourseGetCommand("runs", "study-pipeline/runs", "Read stored pipeline runs.");
addCourseGetCommand("task-view", "study-pipeline/task-view", "Read task view output.");

program
  .command("request")
  .description("Make a raw pipeline API request through the Moodle web proxy.")
  .argument("<method>", "HTTP method")
  .argument("<path>", "Pipeline path, for example /courses/22584/study-pipeline/runs")
  .option("--body <json>", "JSON request body")
  .action(async function (this: Command, method: string, requestPath: string) {
    const options = this.optsWithGlobals<RequestOptions>();
    const body = options.body ? parseJSON(options.body, "--body") : undefined;
    const payload = await pipelineRequest({
      body,
      method: method.toUpperCase(),
      options,
      path: requestPath,
    });
    printJSON(payload, options);
  });

program
  .command("run")
  .description("Trigger a pipeline run.")
  .requiredOption("--course <id>", "Moodle course ID")
  .option("--start <stage>", "Start stage: inventory, raw, extracted, curated", "curated")
  .option("--stage <stage>", "Alias for --start")
  .option("--mode <mode>", "Run mode: from or single", "from")
  .option("--engine <engine>", "Extraction engine")
  .option("--config <hash>", "Config hash")
  .option("--model <id>", "Codex model ID")
  .option("--reasoning-effort <value>", "Codex reasoning effort")
  .addOption(new Option("--resource <id>", "Resource ID. Repeat or comma-separate.").argParser(collectOption).default([]))
  .addOption(new Option("--resources <ids>", "Comma-separated resource IDs.").argParser(collectOption).default([]))
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<RunOptions>();
    const startStage = normalizeStage(options.start ?? options.stage ?? "curated");
    const mode = normalizeMode(options.mode ?? "from");
    const resourceIds = listFlags([...(options.resource ?? []), ...(options.resources ?? [])]);
    const body = removeUndefined({
      mode,
      startStage,
      engine: options.engine,
      configHash: options.config,
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      resourceIds: resourceIds.length > 0 ? resourceIds : undefined,
    });
    const payload = await pipelineRequest({
      body,
      method: "POST",
      options,
      path: `/courses/${encodeURIComponent(options.course)}/study-pipeline/plan`,
    });
    printJSON(payload, options);
  });

program
  .command("verify")
  .description("Summarize failed pipeline runs and missing run links.")
  .requiredOption("--course <id>", "Moodle course ID")
  .option("--limit <n>", "Failed run sample limit", "10")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<VerifyOptions>();
    const [status, runs] = await Promise.all([
      pipelineRequest({
        method: "GET",
        options,
        path: `/courses/${encodeURIComponent(options.course)}/study-pipeline/status`,
      }),
      pipelineRequest({
        method: "GET",
        options,
        path: `/courses/${encodeURIComponent(options.course)}/study-pipeline/runs`,
      }),
    ]);
    const failedRuns = collectRuns(runs).filter((run) => String(run.status ?? "").toLowerCase() === "failed");
    const missingRunLinks = collectStrings(runs, "run record missing");
    const limit = Number.parseInt(String(options.limit ?? "10"), 10);
    const summary = {
      ok: failedRuns.length === 0 && missingRunLinks.length === 0,
      course: options.course,
      stage: status.stage ?? null,
      status: status.status ?? null,
      failedRunCount: failedRuns.length,
      failedRunErrors: countBy(failedRuns.map((run) => String(run.error ?? "unknown"))),
      failedRuns: failedRuns.slice(0, Number.isFinite(limit) && limit >= 0 ? limit : 10).map((run) => ({
        id: run.id ?? null,
        stage: run.stage ?? null,
        resourceId: run.resourceId ?? run.resource_id ?? null,
        error: run.error ?? null,
      })),
      missingRunLinkCount: missingRunLinks.length,
    };
    printJSON(summary, options);
    if (!summary.ok) {
      process.exitCode = 2;
    }
  });

program
  .command("readiness")
  .description("Verify task sheets are ready or have accepted blocker reasons.")
  .requiredOption("--course <id>", "Moodle course ID")
  .option("--allow-blockers <ids>", "Accepted numbered blocker reasons", "1,2,3,4,5")
  .option("--artifact-root <path>", "Read local study pipeline artifacts instead of the API")
  .option("--output <path>", "Write the machine-readable report to a JSON file")
  .option("--no-fail", "Print the report without returning a failing exit code")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<ReadinessOptions>();
    const acceptedBlockerReasonIds = listFlags([options.allowBlockers ?? "1,2,3,4,5"])
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isInteger(item));
    const report = options.artifactRoot
      ? buildTaskSheetReadinessReportFromArtifactRoot({
          acceptedBlockerReasonIds,
          artifactRoot: options.artifactRoot,
          courseId: options.course,
        })
      : await buildTaskSheetReadinessReportFromApi(options, acceptedBlockerReasonIds);
    if (options.output) {
      await writeJSONFile(options.output, report);
    }
    printJSON(report, options);
    if (!report.ok && options.fail !== false) {
      process.exitCode = 2;
    }
  });

program
  .command("promote-curation")
  .description("Publish a saved Codex curation JSON file as active improved task content.")
  .requiredOption("--course <id>", "Moodle course ID")
  .requiredOption("--artifact-root <path>", "Local study pipeline artifact root")
  .requiredOption("--resource <id>", "Task sheet resource ID")
  .requiredOption("--curation-file <path>", "Saved Codex curation JSON file")
  .option("--model <id>", "Model label to store in the improved artifact")
  .option("--output <path>", "Write the promotion result to a JSON file")
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<PromoteCurationOptions>();
    const result = await promoteCurationToImprovedArtifact({
      artifactRoot: options.artifactRoot,
      courseId: options.course,
      curationFile: options.curationFile,
      model: options.model,
      resourceId: options.resource,
    });
    if (options.output) {
      await writeJSONFile(options.output, result);
    }
    printJSON(result, options);
  });

program
  .command("self-test")
  .description("Run local parser/redaction checks without network access.")
  .action(async () => {
    runSelfTest();
    await runReadinessSelfTest();
    await runPromotionSelfTest();
  });

try {
  await program.parseAsync();
} catch (error) {
  printError(error);
  process.exit(1);
}

function addCourseGetCommand(name: string, endpoint: string, description: string) {
  program
    .command(name)
    .description(description)
    .requiredOption("--course <id>", "Moodle course ID")
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<CourseOptions>();
      const payload = await pipelineRequest({
        method: "GET",
        options,
        path: `/courses/${encodeURIComponent(options.course)}/${endpoint}`,
      });
      printJSON(payload, options);
    });
}

async function buildTaskSheetReadinessReportFromApi(options: ReadinessOptions, acceptedBlockerReasonIds: number[]) {
  const [taskView, extractedDocuments] = await Promise.all([
    pipelineRequest({
      method: "GET",
      options,
      path: `/courses/${encodeURIComponent(options.course)}/study-pipeline/task-view`,
    }),
    pipelineRequest({
      method: "GET",
      options,
      path: `/courses/${encodeURIComponent(options.course)}/study-pipeline/extracted-documents`,
    }),
  ]);
  return buildTaskSheetReadinessReport({
    acceptedBlockerReasonIds,
    courseId: options.course,
    extractedDocuments,
    taskView,
  });
}

async function writeJSONFile(filePath: string, payload: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}
