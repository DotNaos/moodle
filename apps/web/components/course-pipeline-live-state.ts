import type {
  BlueprintLiveState,
  BlueprintProblem,
  PipelineRunRecord,
} from "@/components/course-pipeline-blueprint-model";
import type { StudyPipelineStatusResponse } from "@/components/study-pipeline-preview";
import { formatDateTime, STAGE_LABELS } from "@/components/course-pipeline-blueprint-run-utils";

const ACTIVE_STATUSES = new Set(["queued", "running"]);
const WARNING_STATUSES = new Set(["warning", "needs_review", "stale"]);
const SUCCESS_STATUSES = new Set(["ok", "ready", "succeeded", "success"]);

export function normalizeLiveStatus(status: string | undefined): BlueprintLiveState["status"] | null {
  const normalized = status?.toLowerCase();
  if (!normalized || normalized === "not_started" || normalized === "missing" || normalized === "pending") return null;
  if (normalized === "failed" || normalized === "error") return "failed";
  if (ACTIVE_STATUSES.has(normalized)) return normalized as "queued" | "running";
  if (WARNING_STATUSES.has(normalized)) return normalized as "stale" | "warning" | "needs_review";
  if (SUCCESS_STATUSES.has(normalized)) return "succeeded";
  return "warning";
}

export function isLiveStatus(status: string | undefined): boolean {
  const normalized = normalizeLiveStatus(status);
  return normalized === "queued" || normalized === "running";
}

export function isProblemStatus(status: string | undefined): boolean {
  const normalized = normalizeLiveStatus(status);
  return normalized === "failed" || normalized === "warning" || normalized === "needs_review" || normalized === "stale";
}

export function runLiveState(run: PipelineRunRecord): BlueprintLiveState | undefined {
  const status = normalizeLiveStatus(run.status);
  if (!status) return undefined;
  return {
    status,
    label: liveStatusLabel(status),
    detail: `${stageLabel(run.stage)} with ${run.engine}`,
    runId: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    current: status === "queued" || status === "running",
  };
}

export function courseLiveState(status: StudyPipelineStatusResponse | null): BlueprintLiveState | undefined {
  const liveStatus = normalizeLiveStatus(status?.status);
  if (!liveStatus) return undefined;
  return {
    status: liveStatus,
    label: liveStatusLabel(liveStatus),
    detail: status?.stage ? `${stageLabel(status.stage)} stage` : "Course pipeline",
    startedAt: status?.createdAt,
    current: liveStatus === "queued" || liveStatus === "running",
  };
}

export function runDiagnosticProblems(run: PipelineRunRecord): BlueprintProblem[] | undefined {
  const problems: BlueprintProblem[] = [];
  for (const diagnostic of run.diagnostics ?? []) {
    if (diagnostic.level !== "error" && diagnostic.level !== "warning") continue;
    problems.push({
      label: diagnostic.level === "error" ? "Run diagnostic" : "Run warning",
      detail: diagnostic.code ? `${diagnostic.code}: ${diagnostic.message}` : diagnostic.message,
      severity: diagnostic.level === "error" ? "error" : "warning",
    });
  }
  return problems.length > 0 ? problems : undefined;
}

export function runLiveEvidence(run: PipelineRunRecord): string[] {
  const evidence: string[] = [];
  const live = runLiveState(run);
  if (live) {
    evidence.push(`Status ${live.label}`);
  }
  if (run.startedAt) {
    evidence.push(`Started ${formatDateTime(run.startedAt)}`);
  }
  if (run.finishedAt) {
    evidence.push(`Finished ${formatDateTime(run.finishedAt)}`);
  }
  for (const diagnostic of (run.diagnostics ?? []).slice(0, 6)) {
    evidence.push(`${diagnostic.level}: ${diagnostic.message}`);
  }
  for (const line of (run.logs ?? []).slice(0, 6)) {
    evidence.push(`log: ${line}`);
  }
  return evidence;
}

export function runTimingMeta(run: PipelineRunRecord): Array<{ label: string; value: string }> {
  return [
    ...(run.startedAt ? [{ label: "Started", value: formatDateTime(run.startedAt) }] : []),
    ...(run.finishedAt ? [{ label: "Finished", value: formatDateTime(run.finishedAt) }] : []),
  ];
}

export function liveStatusLabel(status: BlueprintLiveState["status"]): string {
  if (status === "succeeded") return "succeeded";
  if (status === "needs_review") return "needs review";
  return status;
}

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}
