import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import path from "node:path";

type JsonObject = Record<string, unknown>;

type ReadinessSheetInput = JsonObject & {
  resourceId?: string;
  title?: string;
  readiness?: string;
  readinessReason?: string;
  readOnly?: boolean;
  solutionResourceId?: string;
  solutionTitle?: string;
  contentState?: JsonObject & {
    status?: string;
    sourcePath?: string;
  };
};

type ExtractedDocumentInput = JsonObject & {
  resource?: JsonObject & {
    id?: string;
    name?: string;
  };
  status?: string;
  sourcePath?: string;
  extractedPath?: string;
  pages?: Array<JsonObject & { previewAssetId?: string }>;
  assets?: Array<JsonObject & { kind?: string; role?: string; mimeType?: string }>;
  diagnostics?: JsonObject & {
    extractedImageAssets?: number | string[];
  };
};

export type ReadinessSheetReport = {
  resourceId: string;
  title: string;
  readiness: string;
  readOnly: boolean;
  contentStatus: string | null;
  contentSourcePath: string | null;
  hasSolution: boolean;
  solutionResourceId: string | null;
  solutionTitle: string | null;
  solutionStatus: "linked" | "missing";
  extractedDocumentStatus: string | null;
  renderedPageCount: number;
  pagePreviewAssetCount: number;
  extractedImageAssetCount: number;
  sourcePath: string | null;
  extractedPath: string | null;
  blockedReasonId: number | null;
  acceptedBlocker: boolean;
  verdict: "ready" | "blocked" | "unprocessed" | "invalid";
  problems: string[];
};

export type ReadinessReport = {
  ok: boolean;
  courseId: string;
  generatedAt: string;
  verifier: {
    acceptedBlockerReasonIds: number[];
    rule: string;
  };
  summary: {
    totalSheets: number;
    ready: number;
    blocked: number;
    unprocessed: number;
    invalid: number;
  };
  sheets: ReadinessSheetReport[];
};

export function buildTaskSheetReadinessReport(input: {
  acceptedBlockerReasonIds?: number[];
  courseId: string;
  extractedDocuments: unknown;
  taskView: unknown;
}): ReadinessReport {
  const acceptedBlockerReasonIds = input.acceptedBlockerReasonIds ?? [1, 2, 3, 4, 5];
  const taskView = asObject(input.taskView);
  const documents = collectExtractedDocuments(input.extractedDocuments);
  const generatedAt = new Date().toISOString();
  const sheets = asArray(taskView.sheets)
    .map((sheet) => buildSheetReport(sheet as ReadinessSheetInput, documents, acceptedBlockerReasonIds));
  const summary = {
    totalSheets: sheets.length,
    ready: sheets.filter((sheet) => sheet.verdict === "ready").length,
    blocked: sheets.filter((sheet) => sheet.verdict === "blocked").length,
    unprocessed: sheets.filter((sheet) => sheet.verdict === "unprocessed").length,
    invalid: sheets.filter((sheet) => sheet.verdict === "invalid").length,
  };
  return {
    ok: summary.unprocessed === 0 && summary.invalid === 0,
    courseId: input.courseId,
    generatedAt,
    verifier: {
      acceptedBlockerReasonIds,
      rule: "Each detected real task sheet must be ready with readOnly=false or blocked with an accepted numbered blocker reason.",
    },
    summary,
    sheets,
  };
}

export function buildTaskSheetReadinessReportFromArtifactRoot(input: {
  acceptedBlockerReasonIds?: number[];
  artifactRoot: string;
  courseId: string;
}) {
  const artifactRoot = expandHome(input.artifactRoot);
  const courseRoot = path.join(artifactRoot, "courses", safeSegment(input.courseId));
  const inventory = readJSON(path.join(courseRoot, "inventory", "course-inventory.json"));
  const extractedDocuments = readJSON(path.join(courseRoot, "extracted", "latest-documents.json"));
  const taskView = {
    courseId: input.courseId,
    generatedAt: new Date().toISOString(),
    source: "local-artifact-root",
    sheets: asArray(asObject(inventory).taskGroups).map((item) => {
      const group = item as JsonObject;
      const sheet = asObject(group.sheet);
      const solution = asObject(group.solution);
      const resourceId = String(sheet.id ?? "");
      const title = String(sheet.name ?? group.title ?? resourceId);
      const improvedPath = path.join(courseRoot, "improved", "tasks", `${safeSegment(`${resourceId}-${title}`)}.mdx`);
      const document = collectExtractedDocuments(extractedDocuments).get(resourceId);
      const hasImproved = existsSync(improvedPath);
      return {
        resourceId,
        title,
        kind: "task",
        readiness: hasImproved ? "ready" : "unprocessed",
        readOnly: !hasImproved,
        readinessReason: hasImproved
          ? "Codex curation has produced the active task output."
          : "Only machine-extracted content is available. Run Codex curation before using this sheet for practice.",
        solutionResourceId: stringOrNull(solution.id) ?? undefined,
        solutionTitle: stringOrNull(solution.name) ?? undefined,
        contentState: {
          id: resourceId,
          kind: "task",
          title,
          status: hasImproved ? "codex-improved" : "machine-extracted",
          statusLabel: hasImproved ? "Codex improved" : "Machine extracted",
          sourcePath: hasImproved ? improvedPath : stringOrNull(document?.extractedPath),
        },
      };
    }),
  };
  return buildTaskSheetReadinessReport({
    acceptedBlockerReasonIds: input.acceptedBlockerReasonIds,
    courseId: input.courseId,
    extractedDocuments,
    taskView,
  });
}

export async function runReadinessSelfTest() {
  const report = buildTaskSheetReadinessReport({
    courseId: "test-course",
    taskView: {
      sheets: [
        {
          resourceId: "ready-1",
          title: "Ready Sheet",
          readiness: "ready",
          readOnly: false,
          solutionResourceId: "solution-1",
          contentState: { status: "codex-improved", sourcePath: "curated/ready.md" },
        },
        {
          resourceId: "blocked-1",
          title: "Blocked Sheet",
          readiness: "blocked",
          readOnly: true,
          blockedReasonId: 3,
          contentState: { status: "machine-extracted" },
        },
        {
          resourceId: "raw-1",
          title: "Raw Sheet",
          readiness: "unprocessed",
          readOnly: true,
          contentState: { status: "machine-extracted" },
        },
      ],
    },
    extractedDocuments: {
      documents: [
        {
          resource: { id: "ready-1", name: "Ready Sheet" },
          status: "extracted",
          pages: [{ previewAssetId: "page-1" }],
          assets: [{ kind: "page-preview", role: "page-preview" }, { kind: "embedded-image", mimeType: "image/png" }],
          diagnostics: { extractedImageAssets: 1 },
        },
      ],
    },
  });
  const ready = report.sheets.find((sheet) => sheet.resourceId === "ready-1");
  const blocked = report.sheets.find((sheet) => sheet.resourceId === "blocked-1");
  const raw = report.sheets.find((sheet) => sheet.resourceId === "raw-1");
  if (report.ok || report.summary.ready !== 1 || report.summary.blocked !== 1 || report.summary.unprocessed !== 1) {
    throw new Error("readiness report summary failed");
  }
  if (ready?.verdict !== "ready" || ready.renderedPageCount !== 1 || ready.extractedImageAssetCount !== 1) {
    throw new Error("ready sheet report failed");
  }
  if (blocked?.verdict !== "blocked" || blocked.blockedReasonId !== 3) {
    throw new Error("blocked sheet report failed");
  }
  if (raw?.verdict !== "unprocessed") {
    throw new Error("unprocessed sheet report failed");
  }
  await runArtifactRootReadinessSelfTest();
}

function readJSON(filePath: string) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runArtifactRootReadinessSelfTest() {
  const root = await mkdtemp(path.join(tmpdir(), "study-readiness-"));
  try {
    const courseRoot = path.join(root, "courses", "test-course");
    await mkdir(path.join(courseRoot, "inventory"), { recursive: true });
    await mkdir(path.join(courseRoot, "extracted"), { recursive: true });
    await mkdir(path.join(courseRoot, "improved", "tasks"), { recursive: true });
    writeJSON(path.join(courseRoot, "inventory", "course-inventory.json"), {
      taskGroups: [
        {
          sheet: { id: "ready-2", name: "Ready 2" },
          solution: { id: "solution-2", name: "Solution 2" },
        },
        {
          sheet: { id: "raw-2", name: "Raw 2" },
        },
      ],
    });
    writeJSON(path.join(courseRoot, "extracted", "latest-documents.json"), {
      documents: [
        {
          resource: { id: "ready-2", name: "Ready 2" },
          status: "machine-extracted",
          extractedPath: "extracted/ready-2.mdx",
          pages: [{ previewAssetId: "page-1" }],
          diagnostics: { extractedImageAssets: 2 },
        },
        {
          resource: { id: "raw-2", name: "Raw 2" },
          status: "machine-extracted",
          extractedPath: "extracted/raw-2.mdx",
          pages: [{ previewAssetId: "page-1" }],
          diagnostics: { extractedImageAssets: 0 },
        },
      ],
    });
    writeFileSync(path.join(courseRoot, "improved", "tasks", "ready-2-ready-2.mdx"), "---\nstatus: codex-improved\n---\n\n# Ready 2\n");

    const report = buildTaskSheetReadinessReportFromArtifactRoot({
      artifactRoot: root,
      courseId: "test-course",
    });
    const ready = report.sheets.find((sheet) => sheet.resourceId === "ready-2");
    const raw = report.sheets.find((sheet) => sheet.resourceId === "raw-2");
    if (report.ok || report.summary.ready !== 1 || report.summary.unprocessed !== 1) {
      throw new Error("artifact-root readiness summary failed");
    }
    if (ready?.verdict !== "ready" || ready.readOnly || ready.extractedImageAssetCount !== 2) {
      throw new Error("artifact-root ready sheet failed");
    }
    if (raw?.verdict !== "unprocessed" || !raw.readOnly) {
      throw new Error("artifact-root unprocessed sheet failed");
    }
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function writeJSON(filePath: string, payload: unknown) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function buildSheetReport(
  sheet: ReadinessSheetInput,
  documents: Map<string, ExtractedDocumentInput>,
  acceptedBlockerReasonIds: number[],
): ReadinessSheetReport {
  const resourceId = String(sheet.resourceId ?? "");
  const document = documents.get(resourceId);
  const readiness = String(sheet.readiness ?? "unknown").toLowerCase();
  const readOnly = Boolean(sheet.readOnly);
  const blockedReasonId = blockerReasonId(sheet);
  const acceptedBlocker = blockedReasonId !== null && acceptedBlockerReasonIds.includes(blockedReasonId);
  const problems: string[] = [];
  let verdict: ReadinessSheetReport["verdict"] = "invalid";

  if (readiness === "ready") {
    verdict = "ready";
    if (readOnly) {
      problems.push("ready sheet is still read-only");
      verdict = "invalid";
    }
  } else if (readiness === "blocked") {
    if (acceptedBlocker) {
      verdict = "blocked";
    } else {
      problems.push("blocked sheet is missing an accepted numbered blocker reason");
      verdict = "invalid";
    }
  } else {
    problems.push("sheet is neither ready nor accepted blocked");
    verdict = "unprocessed";
  }

  if (!resourceId) {
    problems.push("sheet has no resourceId");
    verdict = "invalid";
  }

  return {
    resourceId,
    title: String(sheet.title ?? resourceId),
    readiness,
    readOnly,
    contentStatus: stringOrNull(sheet.contentState?.status),
    contentSourcePath: stringOrNull(sheet.contentState?.sourcePath),
    hasSolution: Boolean(sheet.solutionResourceId),
    solutionResourceId: stringOrNull(sheet.solutionResourceId),
    solutionTitle: stringOrNull(sheet.solutionTitle),
    solutionStatus: sheet.solutionResourceId ? "linked" : "missing",
    extractedDocumentStatus: stringOrNull(document?.status),
    renderedPageCount: asArray(document?.pages).length,
    pagePreviewAssetCount: countPagePreviewAssets(document),
    extractedImageAssetCount: countExtractedImages(document),
    sourcePath: stringOrNull(document?.sourcePath),
    extractedPath: stringOrNull(document?.extractedPath),
    blockedReasonId,
    acceptedBlocker,
    verdict,
    problems,
  };
}

function collectExtractedDocuments(payload: unknown) {
  const documents = new Map<string, ExtractedDocumentInput>();
  for (const document of asArray(asObject(payload).documents)) {
    const entry = document as ExtractedDocumentInput;
    const id = entry.resource?.id;
    if (id) {
      documents.set(String(id), entry);
    }
  }
  return documents;
}

function blockerReasonId(sheet: ReadinessSheetInput): number | null {
  const direct = firstNumber([
    sheet.blockedReasonId,
    sheet.blockerReasonId,
    asObject(sheet.blockedReason).id,
    asObject(sheet.blockerReason).id,
    asObject(sheet.blocker).reasonId,
  ]);
  if (direct !== null) {
    return direct;
  }
  if (String(sheet.readiness ?? "").toLowerCase() !== "blocked") {
    return null;
  }
  const reason = String(sheet.readinessReason ?? "");
  const match = reason.match(/\b(?:reason|blocker|grund)\s*#?\s*([1-5])\b/i) ?? reason.match(/^\s*([1-5])(?:[).:\s-]|$)/);
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

function firstNumber(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }
    if (typeof value === "string" && /^[1-5]$/.test(value.trim())) {
      return Number.parseInt(value.trim(), 10);
    }
  }
  return null;
}

function countPagePreviewAssets(document: ExtractedDocumentInput | undefined) {
  if (!document) {
    return 0;
  }
  const pagesWithPreview = asArray(document.pages).filter((page) => Boolean((page as JsonObject).previewAssetId)).length;
  const assetsWithPreviewRole = asArray(document.assets).filter((asset) => {
    const item = asset as JsonObject;
    return item.kind === "page-preview" || item.role === "page-preview";
  }).length;
  return Math.max(pagesWithPreview, assetsWithPreviewRole);
}

function countExtractedImages(document: ExtractedDocumentInput | undefined) {
  if (!document) {
    return 0;
  }
  const diagnosticCount = document.diagnostics?.extractedImageAssets;
  if (typeof diagnosticCount === "number") {
    return diagnosticCount;
  }
  if (Array.isArray(diagnosticCount)) {
    return diagnosticCount.length;
  }
  return asArray(document.assets).filter((asset) => {
    const item = asset as JsonObject;
    return item.kind === "embedded-image" || item.role === "embedded-image" || String(item.mimeType ?? "").startsWith("image/");
  }).length;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function expandHome(value: string) {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return path.join(homedir(), value.slice(2));
  }
  return value;
}

function safeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replace(/[-._]+$/g, "")
    .replace(/^[-._]+/g, "");
  return normalized ? normalized.slice(0, 96) : "untitled";
}
