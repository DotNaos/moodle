"use client";

import { AlertCircle, CheckCircle2, Circle, GitBranch, Loader2, Play, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  CoursePipelineBlueprint,
  type PipelineRunsResponse,
} from "@/components/course-pipeline-blueprint";
import type { BlueprintRunScope } from "@/components/course-pipeline-blueprint-model";
import { hasPipelineLiveWork } from "@/components/course-pipeline-progress";
import type { ExtractedDocumentsResponse } from "@/components/extracted-document-inspector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CourseInventoryResponse,
  StudyPipelineStatusResponse,
} from "@/components/study-pipeline-preview";
import type { TaskViewResponse } from "@/components/task-study-panel";
import type { Course } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";

type CoursePipelineInspectorProps = {
  course: Course;
  courseId: string;
};

type OptionalInspectorData = "extractedDocuments" | "inventory" | "runs" | "taskView";
type PipelineStageId = "inventory" | "raw" | "extracted" | "curated";
type PipelineRunMode = "single" | "from";
type PipelineScopeMode = "course" | "selected";
type PipelineStepState = "failed" | "queued" | "running" | "succeeded";

type PipelinePlanStep = {
  detail?: string;
  id: string;
  label: string;
  state: PipelineStepState;
  stage: PipelineStageId;
};

type PipelinePlanResponse = {
  courseId: string;
  response?: StudyPipelineStatusResponse;
  status: "failed" | "succeeded" | string;
  steps: Array<{
    error?: string;
    stage: PipelineStageId;
    status: PipelineStepState | string;
  }>;
};

const PIPELINE_STAGES: Array<{ id: PipelineStageId; label: string }> = [
  { id: "inventory", label: "Inventory" },
  { id: "raw", label: "Raw import" },
  { id: "extracted", label: "Extraction" },
  { id: "curated", label: "Codex" },
];

export function CoursePipelineInspector({
  course,
  courseId,
}: CoursePipelineInspectorProps) {
  const [inventory, setInventory] = useState<CourseInventoryResponse | null>(null);
  const [status, setStatus] = useState<StudyPipelineStatusResponse | null>(null);
  const [runs, setRuns] = useState<PipelineRunsResponse | null>(null);
  const [extractedDocuments, setExtractedDocuments] = useState<ExtractedDocumentsResponse | null>(null);
  const [taskView, setTaskView] = useState<TaskViewResponse | null>(null);
  const [unavailable, setUnavailable] = useState<Partial<Record<OptionalInspectorData, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectingRunId, setSelectingRunId] = useState<string | null>(null);
  const [rerunningEngine, setRerunningEngine] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<BlueprintRunScope | null>(null);
  const [runMode, setRunMode] = useState<PipelineRunMode>("from");
  const [runScopeMode, setRunScopeMode] = useState<PipelineScopeMode>("selected");
  const [runStartStage, setRunStartStage] = useState<PipelineStageId>("extracted");
  const [runPlan, setRunPlan] = useState<PipelinePlanStep[]>([]);
  const [runningPlanId, setRunningPlanId] = useState<string | null>(null);

  const liveWork = useMemo(
    () => hasPipelineLiveWork({
      actionIds: [selectingRunId, rerunningEngine, runningPlanId],
      runs,
      status,
    }),
    [rerunningEngine, runningPlanId, runs, selectingRunId, status],
  );

  useEffect(() => {
    void loadInspectorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!liveWork) return;
    const timer = window.setInterval(() => {
      void loadInspectorData({ silent: true });
    }, 3500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, liveWork]);

  async function loadInspectorData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
      setUnavailable({});
    }
    try {
      const [statusResult, inventoryResult, runsResult] = await Promise.allSettled([
        studyPipelineRequest<StudyPipelineStatusResponse>(courseId, ""),
        studyPipelineRequest<CourseInventoryResponse>(courseId, "/inventory"),
        studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs"),
      ]);

      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
      } else {
        setStatus(null);
        setError(formatStudyPipelineError(statusResult.reason));
      }

      const nextUnavailable: Partial<Record<OptionalInspectorData, string>> = {};
      if (inventoryResult.status === "fulfilled") {
        setInventory(inventoryResult.value);
      } else {
        setInventory(null);
        nextUnavailable.inventory = formatStudyPipelineError(inventoryResult.reason);
      }
      if (runsResult.status === "fulfilled") {
        setRuns(runsResult.value);
      } else {
        setRuns(null);
        nextUnavailable.runs = formatStudyPipelineError(runsResult.reason);
      }
      setUnavailable(nextUnavailable);
      if (!options?.silent) {
        setLoading(false);
      }

      void loadOptionalInspectorData({ baseUnavailable: nextUnavailable });
    } catch (loadError) {
      if (!options?.silent) {
        setError(formatStudyPipelineError(loadError));
        setLoading(false);
      }
    }
  }

  async function loadOptionalInspectorData(options?: { baseUnavailable?: Partial<Record<OptionalInspectorData, string>> }) {
    const [extractedDocumentsResult, taskViewResult] = await Promise.allSettled([
      studyPipelineRequest<ExtractedDocumentsResponse>(courseId, "/extracted-documents"),
      loadTaskViewForInspector(courseId),
    ]);

    const nextUnavailable = { ...(options?.baseUnavailable ?? {}) };
    if (extractedDocumentsResult.status === "fulfilled") {
      setExtractedDocuments(extractedDocumentsResult.value);
      delete nextUnavailable.extractedDocuments;
    } else {
      setExtractedDocuments(null);
      nextUnavailable.extractedDocuments = formatStudyPipelineError(extractedDocumentsResult.reason);
    }
    if (taskViewResult.status === "fulfilled") {
      setTaskView(taskViewResult.value);
      delete nextUnavailable.taskView;
    } else {
      setTaskView(null);
      nextUnavailable.taskView = formatStudyPipelineError(taskViewResult.reason);
    }
    setUnavailable(nextUnavailable);
  }

  async function selectActiveRun(runId: string) {
    setSelectingRunId(runId);
    setError(null);
    try {
      await studyPipelinePost(courseId, `/runs/${encodeURIComponent(runId)}/select`, {
        reason: "selected in course pipeline inspector",
      });
      setRuns(await studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs"));
    } catch (selectError) {
      setError(formatStudyPipelineError(selectError));
    } finally {
      setSelectingRunId(null);
    }
  }

  async function rerunExtracted(engine: string) {
    setRerunningEngine(engine);
    setError(null);
    try {
      setStatus(await studyPipelinePost<StudyPipelineStatusResponse>(courseId, "/extracted", {
        configHash: `config:extracted:${engine}:default`,
        engine,
      }));
      setRuns(await studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs"));
    } catch (rerunError) {
      setError(formatStudyPipelineError(rerunError));
    } finally {
      setRerunningEngine(null);
    }
  }

  async function runPipelinePlan() {
    const runId = makeClientRunId();
    const scope = resolveRunScope({ mode: runScopeMode, selectedScope });
    const stages = stagesForPlan(runMode, runStartStage);
    setRunningPlanId(runId);
    setError(null);
    setRunPlan(stages.map((stage) => ({
      id: `${runId}:${stage.id}`,
      label: stage.label,
      state: "queued",
      stage: stage.id,
    })));

    try {
      setRunPlan((current) => markPlanStep(current, stages[0]?.id ?? runStartStage, "running"));
      const response = await studyPipelinePost<PipelinePlanResponse>(
        courseId,
        "/plan",
        planRequestBody(runMode, runStartStage, scope),
      );
      setRunPlan(planStepsFromResponse(runId, stages, response.steps));
      if (response.response) {
        setStatus(response.response);
      }
      if (response.status === "failed") {
        const failedStep = response.steps.find((step) => step.status === "failed");
        if (failedStep?.error) {
          setError(failedStep.error);
        }
      }
    } catch (runError) {
      setRunPlan((current) => markRunningPlanStepFailed(current, formatStudyPipelineError(runError)));
      setError(formatStudyPipelineError(runError));
    } finally {
      setRunningPlanId(null);
      await loadInspectorData({ silent: true });
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:h-full">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GitBranch aria-hidden className="size-4" />
                Pipeline
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{courseTitle(course)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge loading={loading} liveWork={liveWork} status={status?.status} />
              <Button disabled={loading} onClick={() => void loadInspectorData()} type="button" variant="secondary">
                {loading ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
                Refresh
              </Button>
            </div>
          </header>

          {error ? (
            <div className="flex items-start gap-2 rounded-3xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <PipelineRunControl
            disabled={Boolean(runningPlanId) || loading}
            mode={runMode}
            onModeChange={setRunMode}
            onRun={() => void runPipelinePlan()}
            onScopeModeChange={setRunScopeMode}
            onStartStageChange={setRunStartStage}
            plan={runPlan}
            scopeMode={runScopeMode}
            selectedScope={selectedScope}
            startStage={runStartStage}
          />

          <CoursePipelineBlueprint
            extractedDocuments={extractedDocuments}
            inventory={inventory}
            onRerunExtraction={(engine) => void rerunExtracted(engine)}
            onSelectedScopeChange={setSelectedScope}
            onSelectRun={(runId) => void selectActiveRun(runId)}
            rerunningEngine={rerunningEngine}
            runs={runs}
            selectingRunId={selectingRunId}
            status={status}
            taskView={taskView}
            unavailable={{
              extractedDocuments: unavailable.extractedDocuments,
              inventory: unavailable.inventory,
              runs: unavailable.runs,
              taskView: unavailable.taskView,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function PipelineRunControl({
  disabled,
  mode,
  onModeChange,
  onRun,
  onScopeModeChange,
  onStartStageChange,
  plan,
  scopeMode,
  selectedScope,
  startStage,
}: {
  disabled: boolean;
  mode: PipelineRunMode;
  onModeChange: (mode: PipelineRunMode) => void;
  onRun: () => void;
  onScopeModeChange: (mode: PipelineScopeMode) => void;
  onStartStageChange: (stage: PipelineStageId) => void;
  plan: PipelinePlanStep[];
  scopeMode: PipelineScopeMode;
  selectedScope: BlueprintRunScope | null;
  startStage: PipelineStageId;
}) {
  const effectiveScope = resolveRunScope({ mode: scopeMode, selectedScope });
  const running = plan.some((step) => step.state === "running");
  const completed = plan.filter((step) => step.state === "succeeded").length;
  const percent = plan.length === 0 ? 0 : Math.round((completed / plan.length) * 100);
  const canUseSelection = Boolean(selectedScope && selectedScope.kind !== "course");
  const runLabel = mode === "single" ? "Schritt starten" : "Ab hier starten";
  const scopeLabel = effectiveScope.kind === "course" ? "Ganzer Kurs" : effectiveScope.label;

  return (
    <section className="rounded-3xl bg-secondary/45 p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-2 sm:grid-cols-3">
          <PipelineSelect
            disabled={disabled}
            label="Modus"
            onChange={(value) => onModeChange(value as PipelineRunMode)}
            options={[
              { label: "Ab Schritt", value: "from" },
              { label: "Nur Schritt", value: "single" },
            ]}
            value={mode}
          />
          <PipelineSelect
            disabled={disabled}
            label="Start"
            onChange={(value) => onStartStageChange(value as PipelineStageId)}
            options={PIPELINE_STAGES.map((stage) => ({ label: stage.label, value: stage.id }))}
            value={startStage}
          />
          <PipelineSelect
            disabled={disabled}
            label="Scope"
            onChange={(value) => onScopeModeChange(value as PipelineScopeMode)}
            options={[
              { label: "Ganzer Kurs", value: "course" },
              { disabled: !canUseSelection, label: "Auswahl", value: "selected" },
            ]}
            value={scopeMode === "selected" && canUseSelection ? "selected" : "course"}
          />
        </div>

        <Button className="h-11 w-full rounded-full px-4 lg:w-fit" disabled={disabled} onClick={onRun} type="button">
          {running ? <Spinner aria-hidden /> : <Play aria-hidden />}
          {runLabel}
        </Button>
      </div>

      <p className="mt-2 truncate text-xs text-muted-foreground">
        {running ? "Server-Run läuft. Seite kann geschlossen werden. " : ""}
        Scope: <span className="font-medium text-foreground">{scopeLabel}</span>
        {effectiveScope.resourceIds.length > 0 ? ` · ${effectiveScope.resourceIds.length} resource${effectiveScope.resourceIds.length === 1 ? "" : "s"}` : ""}
      </p>

      {plan.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{running ? "Pipeline läuft" : percent === 100 ? "Pipeline fertig" : "Pipeline bereit"}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {plan.map((step) => (
              <PipelinePlanStepTile key={step.id} step={step} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PipelineSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ disabled?: boolean; label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="px-1 text-xs font-medium text-muted-foreground">{label}</span>
      <select
        className="h-11 min-w-0 rounded-full bg-background px-4 text-sm font-semibold text-foreground outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PipelinePlanStepTile({ step }: { step: PipelinePlanStep }) {
  const Icon = step.state === "succeeded"
    ? CheckCircle2
    : step.state === "failed"
      ? XCircle
      : step.state === "running"
        ? Loader2
        : Circle;
  return (
    <div className="rounded-2xl bg-background/70 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden className={`size-4 ${step.state === "running" ? "animate-spin" : ""}`} />
        {step.label}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{step.detail ?? stepStateLabel(step.state)}</p>
    </div>
  );
}

function StatusBadge({
  liveWork,
  loading,
  status,
}: {
  liveWork: boolean;
  loading: boolean;
  status?: string;
}) {
  if (loading || liveWork) {
    return (
      <Badge className="rounded-full">
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
        {liveWork ? "Live" : "Loading"}
      </Badge>
    );
  }
  if (!status) return null;
  return <Badge className="rounded-full" variant="outline">{status}</Badge>;
}

function resolveRunScope({
  mode,
  selectedScope,
}: {
  mode: PipelineScopeMode;
  selectedScope: BlueprintRunScope | null;
}): BlueprintRunScope {
  if (mode === "selected" && selectedScope) return selectedScope;
  return { kind: "course", label: "Whole course", resourceIds: [] };
}

function stagesForPlan(mode: PipelineRunMode, startStage: PipelineStageId) {
  const startIndex = PIPELINE_STAGES.findIndex((stage) => stage.id === startStage);
  if (mode === "single") return PIPELINE_STAGES.filter((stage) => stage.id === startStage);
  return PIPELINE_STAGES.slice(Math.max(0, startIndex));
}

function stageRequestBody(stage: PipelineStageId, scope: BlueprintRunScope) {
  return {
    ...(stage === "extracted" ? { configHash: "config:extracted:pdftotext:default", engine: "pdftotext" } : {}),
    ...(scope.resourceIds.length > 0 ? { resourceIds: scope.resourceIds } : {}),
  };
}

function planRequestBody(mode: PipelineRunMode, startStage: PipelineStageId, scope: BlueprintRunScope) {
  return {
    ...stageRequestBody(startStage, scope),
    mode,
    startStage,
  };
}

function planStepsFromResponse(
  runId: string,
  expectedStages: Array<{ id: PipelineStageId; label: string }>,
  responseSteps: PipelinePlanResponse["steps"],
): PipelinePlanStep[] {
  const labels = new Map(PIPELINE_STAGES.map((stage) => [stage.id, stage.label]));
  const expectedIds = new Set(expectedStages.map((stage) => stage.id));
  const normalized = responseSteps
    .filter((step) => expectedIds.has(step.stage))
    .map((step) => ({
      detail: step.error,
      id: `${runId}:${step.stage}`,
      label: labels.get(step.stage) ?? step.stage,
      state: normalizePlanStepState(step.status),
      stage: step.stage,
    }));
  return normalized.length > 0
    ? normalized
    : expectedStages.map((stage) => ({
      id: `${runId}:${stage.id}`,
      label: stage.label,
      state: "queued",
      stage: stage.id,
    }));
}

function normalizePlanStepState(state: string): PipelineStepState {
  switch (state) {
    case "failed":
    case "queued":
    case "running":
    case "succeeded":
      return state;
    default:
      return "queued";
  }
}

function markPlanStep(plan: PipelinePlanStep[], stage: PipelineStageId, state: PipelineStepState): PipelinePlanStep[] {
  return plan.map((step) => step.stage === stage ? { ...step, detail: undefined, state } : step);
}

function markRunningPlanStepFailed(plan: PipelinePlanStep[], detail: string): PipelinePlanStep[] {
  let marked = false;
  return plan.map((step) => {
    if (!marked && step.state === "running") {
      marked = true;
      return { ...step, detail, state: "failed" };
    }
    return step;
  });
}

function stepStateLabel(state: PipelineStepState): string {
  switch (state) {
    case "failed":
      return "failed";
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "done";
  }
}

function makeClientRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}`;
}

async function studyPipelineRequest<T>(courseId: string, suffix: string): Promise<T> {
  const response = await fetch(
    `/api/study-pipeline/courses/${encodeURIComponent(courseId)}/study-pipeline${suffix}`,
    { cache: "no-store" },
  );
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Moodle study pipeline failed with ${response.status}.`);
  }
  return payload as T;
}

async function studyPipelinePost<T>(courseId: string, suffix: string, body: unknown): Promise<T> {
  const response = await fetch(
    `/api/study-pipeline/courses/${encodeURIComponent(courseId)}/study-pipeline${suffix}`,
    {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Moodle study pipeline failed with ${response.status}.`);
  }
  return payload as T;
}

async function loadTaskViewForInspector(courseId: string): Promise<TaskViewResponse> {
  const query = "includeScript=1";
  try {
    return await studyPipelineRequest<TaskViewResponse>(courseId, `/task-view?${query}`);
  } catch (pipelineError) {
    const bundleResponse = await fetch(`/api/study-bundles/courses/${encodeURIComponent(courseId)}/task-view?${query}`, {
      cache: "no-store",
    });
    if (bundleResponse.ok) {
      return await bundleResponse.json() as TaskViewResponse;
    }
    if (![400, 404].includes(bundleResponse.status)) {
      const payload = await bundleResponse.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? formatStudyPipelineError(pipelineError));
    }
    throw pipelineError;
  }
}

function formatStudyPipelineError(error: unknown): string {
  return error instanceof Error ? error.message : "Moodle study pipeline failed.";
}
