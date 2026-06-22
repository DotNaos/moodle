#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

type CriterionStatus = "met" | "pending" | "failed";

type Criterion = {
  id: number;
  status: CriterionStatus;
  requirement: string;
  evidence: string[];
  notes: string[];
};

const courseId = "22584";
const readinessPath = "plans/task-sheet-readiness-22584-goal1.json";
const promotionPath = "plans/task-sheet-promotion-22584-goal1.json";
const taskViewEvidencePath = "plans/task-view-22584-goal1-evidence.json";
const reviewPath = "plans/task-sheet-curation-goal1-review.md";
const outputPath = process.argv[2] ?? "plans/task-sheet-goal1-acceptance-audit.json";

const readiness = readJson(readinessPath);
const promotion = readJson(promotionPath);
const taskViewEvidence = readJson(taskViewEvidencePath);
const summary = asObject(readiness.summary);
const sheets = asArray(readiness.sheets).map(asObject);
const promotedSheet = asObject(taskViewEvidence.promotedSheet);
const promotedTaskView = asObject(promotedSheet.taskView);
const promotedReadiness = asObject(promotedSheet.readinessReport);

const inventoryFieldsPresent = sheets.every((sheet) => {
  return Boolean(sheet.resourceId)
    && typeof sheet.readiness === "string"
    && typeof sheet.solutionStatus === "string"
    && typeof sheet.renderedPageCount === "number"
    && typeof sheet.extractedImageAssetCount === "number";
});

const verifierConfigured = asArray(asObject(readiness.verifier).acceptedBlockerReasonIds).join(",") === "1,2,3,4,5";
const verifierFailsOpenCourse = readiness.ok === false && Number(summary.unprocessed ?? 0) > 0 && Number(summary.invalid ?? 0) === 0;
const promotionMatches = promotion.ok === true
  && promotion.action === "promote-curation"
  && promotion.courseId === courseId
  && promotion.resourceId === "947753"
  && String(promotion.targetPath ?? "").includes("947753-aufgabenblatt-12.mdx");
const taskViewReady = promotedTaskView.readiness === "ready"
  && promotedTaskView.readOnly === false
  && promotedTaskView.contentStatus === "codex-improved"
  && promotedTaskView.promptHasMoodleSource === true
  && promotedTaskView.promptHasPlaceholder === false
  && promotedTaskView.promptHasExtractedAssetImage === true
  && promotedReadiness.verdict === "ready"
  && promotedReadiness.readOnly === false;
const remainingClear = Number(summary.totalSheets ?? 0) === sheets.length
  && Number(summary.totalSheets ?? 0) === 12
  && Number(summary.ready ?? 0) === 4
  && Number(summary.unprocessed ?? 0) === 8
  && Number(summary.invalid ?? 0) === 0
  && sheets.every((sheet) => ["ready", "unprocessed", "blocked", "invalid"].includes(String(sheet.verdict ?? "")));

const audit = {
  ok: false,
  courseId,
  generatedAt: auditGeneratedAt(),
  summary: {
    totalSheets: summary.totalSheets ?? null,
    ready: summary.ready ?? null,
    blocked: summary.blocked ?? null,
    unprocessed: summary.unprocessed ?? null,
    invalid: summary.invalid ?? null,
    technicalCriteriaMet: 5,
    pendingCriteria: [6],
  },
  criteria: [
    criterion(
      1,
      inventoryFieldsPresent,
      "Machine-readable inventory exists for every detected task sheet with readiness, solution status, rendered-page availability, and extracted-image availability.",
      [readinessPath],
      [
        `${String(summary.totalSheets ?? "unknown")} detected task sheets are listed.`,
        "Each sheet includes readiness, solutionStatus, renderedPageCount, and extractedImageAssetCount.",
      ],
    ),
    criterion(
      2,
      verifierConfigured && verifierFailsOpenCourse,
      "Verifier exists and fails unless every real task sheet is ready or has accepted blocker reason 1-5.",
      [readinessPath],
      [
        "Accepted blocker reason IDs are 1,2,3,4,5.",
        "Current report has ok=false because 8 sheets are still unprocessed.",
      ],
    ),
    criterion(
      3,
      promotionMatches,
      "At least one previously unprocessed sheet is curated through API/CLI, not frontend clicks.",
      [promotionPath],
      [
        "Promotion action is promote-curation.",
        "Resource 947753 / Aufgabenblatt 12 was written to the improved task artifact.",
      ],
    ),
    criterion(
      4,
      taskViewReady,
      "The curated sheet is verified through artifacts and task-view as ready with readOnly=false, preserved Moodle source reference, no raw placeholder, and image evidence used or accounted for.",
      [taskViewEvidencePath, readinessPath],
      [
        "Task-view evidence shows ready, readOnly=false, contentStatus=codex-improved.",
        "Task-view prompt preserves moodle-resource:947753, has extracted image evidence, and has no unprocessed placeholder.",
      ],
    ),
    criterion(
      5,
      remainingClear,
      "Remaining sheets have clear machine-readable status.",
      [readinessPath, reviewPath],
      [
        "Current summary is 4 ready, 8 unprocessed, 0 blocked, 0 invalid.",
        "Every remaining unprocessed sheet still has solution, rendered-page, and extracted-image status.",
      ],
    ),
    {
      id: 6,
      status: "pending",
      requirement: "The user reviews and explicitly accepts the non-UI result before Goal 1.5 or Goal 2 starts.",
      evidence: [reviewPath],
      notes: [
        "This criterion cannot be completed by code.",
        "Goal 1 stays open until the user explicitly accepts the non-UI result.",
      ],
    },
  ] satisfies Criterion[],
};

audit.ok = audit.criteria.every((item) => item.status === "met");

await mkdir(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);

function criterion(id: number, passed: boolean, requirement: string, evidence: string[], notes: string[]): Criterion {
  return {
    id,
    status: passed ? "met" : "failed",
    requirement,
    evidence,
    notes,
  };
}

function readJson(filePath: string): JsonObject {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function auditGeneratedAt(): string {
  const candidates = [
    taskViewEvidence.generatedAt,
    readiness.generatedAt,
    promotion.generatedAt,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return "unknown";
}
