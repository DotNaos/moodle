"use client";

import { AlertCircle, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CoursePipelineBlueprint,
  type PipelineRunsResponse,
} from "@/components/course-pipeline-blueprint";
import type { BlueprintRunScope } from "@/components/course-pipeline-blueprint-model";
import { resourceKeys } from "@/components/course-pipeline-blueprint-model";
import type { BlueprintRunRequest } from "@/components/course-pipeline-blueprint-model";
import { hasPipelineLiveWork } from "@/components/course-pipeline-progress";
import {
  markPlanStep,
  markRunningPlanStepFailed,
  markRunningPlanStepWaitingForStatus,
  PipelineRunControl,
  planRequestBody,
  planStepsFromResponse,
  resolveRunScope,
  stagesForPlan,
  type PipelinePlanResponse,
  type PipelinePlanStep,
  type PipelineRunMode,
  type PipelineScopeMode,
  type PipelineStageId,
} from "@/components/course-pipeline-run-control";
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
import { useCodexModels } from "@/hooks/use-codex-models";
import {
  derivePipelineGate,
  firstPipelineGateError,
  isPipelineGateError,
  type PipelineGateError,
} from "@/lib/pipeline-inspector-gate";

type CoursePipelineInspectorProps = {
  course: Course | null;
  courseId: string;
};

type OptionalInspectorData = "extractedDocuments" | "inventory" | "runs" | "taskView";

export function CoursePipelineInspector({
  course,
  courseId,
}: CoursePipelineInspectorProps) {
  const router = useRouter();
  const [inventory, setInventory] = useState<CourseInventoryResponse | null>(null);
  const [status, setStatus] = useState<StudyPipelineStatusResponse | null>(null);
  const [runs, setRuns] = useState<PipelineRunsResponse | null>(null);
  const [extractedDocuments, setExtractedDocuments] = useState<ExtractedDocumentsResponse | null>(null);
  const [taskView, setTaskView] = useState<TaskViewResponse | null>(null);
  const [unavailable, setUnavailable] = useState<Partial<Record<OptionalInspectorData, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<PipelineGateError | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectingRunId, setSelectingRunId] = useState<string | null>(null);
  const [rerunningEngine, setRerunningEngine] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<BlueprintRunScope | null>(null);
  const [runMode, setRunMode] = useState<PipelineRunMode>("from");
  const [runScopeMode, setRunScopeMode] = useState<PipelineScopeMode>("selected");
  const [runStartStage, setRunStartStage] = useState<PipelineStageId>("extracted");
  const [runPlan, setRunPlan] = useState<PipelinePlanStep[]>([]);
  const [runningPlanId, setRunningPlanId] = useState<string | null>(null);
  const [monitoringDetachedPlanId, setMonitoringDetachedPlanId] = useState<string | null>(null);
  const codexModels = useCodexModels(courseId);

  const serverLiveWork = useMemo(
    () => hasPipelineLiveWork({
      actionIds: [selectingRunId, rerunningEngine, runningPlanId],
      runs,
      status,
    }),
    [rerunningEngine, runningPlanId, runs, selectingRunId, status],
  );
  const liveWork = useMemo(
    () => serverLiveWork || Boolean(monitoringDetachedPlanId),
    [monitoringDetachedPlanId, serverLiveWork],
  );
  const gate = derivePipelineGate({
    blockingError: gateError,
    inventoryLoaded: Boolean(inventory),
    loading,
    statusLoaded: Boolean(status),
  });
  const redirectingToConnect = gate.kind === "blocked" && shouldRedirectToMoodleConnect(gate.issue);
  const displayedRunScope = useMemo(() => {
    const scope = resolveRunScope({ mode: runScopeMode, selectedScope });
    const normalized = normalizeScopeForPlan(scope, stagesForPlan(runMode, runStartStage), inventory);
    return normalized.kind === "course" ? selectedScope : normalized;
  }, [inventory, runMode, runScopeMode, runStartStage, selectedScope]);

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

  useEffect(() => {
    if (!redirectingToConnect) return;
    router.replace(`/moodle/connect?next=${encodeURIComponent(`/courses/${courseId}/pipeline`)}`);
  }, [courseId, redirectingToConnect, router]);

  useEffect(() => {
    if (!monitoringDetachedPlanId || serverLiveWork || (!status && !runs)) return;
    setMonitoringDetachedPlanId(null);
    setRunPlan([]);
    setError(null);
  }, [monitoringDetachedPlanId, runs, serverLiveWork, status]);

  async function loadInspectorData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
      setGateError(null);
      setUnavailable({});
    }
    try {
      const [statusResult, inventoryResult, runsResult] = await Promise.allSettled([
        studyPipelineRequest<StudyPipelineStatusResponse>(courseId, ""),
        studyPipelineRequest<CourseInventoryResponse>(courseId, "/inventory"),
        studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs"),
      ]);

      const primaryGateError = firstPipelineGateError([
        statusResult.status === "rejected" ? statusResult.reason : null,
        inventoryResult.status === "rejected" ? inventoryResult.reason : null,
        runsResult.status === "rejected" ? runsResult.reason : null,
      ]);

      if (primaryGateError) {
        setStatus(null);
        setInventory(null);
        setRuns(null);
        setExtractedDocuments(null);
        setTaskView(null);
        setUnavailable({});
        setGateError(primaryGateError);
        if (!options?.silent) {
          setLoading(false);
        }
        return;
      }

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
        if (isPipelineGateError(loadError)) {
          setGateError(loadError);
        } else {
          setError(formatStudyPipelineError(loadError));
        }
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
    const optionalGateError = firstPipelineGateError([
      extractedDocumentsResult.status === "rejected" ? extractedDocumentsResult.reason : null,
      taskViewResult.status === "rejected" ? taskViewResult.reason : null,
    ]);
    if (optionalGateError) {
      setExtractedDocuments(null);
      setTaskView(null);
      setUnavailable({});
      setGateError(optionalGateError);
      return;
    }

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
      handlePipelineActionError(selectError, setError, setGateError);
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
      handlePipelineActionError(rerunError, setError, setGateError);
    } finally {
      setRerunningEngine(null);
    }
  }

  async function runPipelinePlan(override?: BlueprintRunRequest) {
    const runId = makeClientRunId();
    const nextMode = override?.mode ?? runMode;
    const nextStartStage = override?.startStage ?? runStartStage;
    const stages = stagesForPlan(nextMode, nextStartStage);
    const initialScope = override?.scope ?? resolveRunScope({ mode: runScopeMode, selectedScope });
    const scope = normalizeScopeForPlan(initialScope, stages, inventory);
    if (override) {
      setRunMode(nextMode);
      setRunStartStage(nextStartStage);
      setRunScopeMode(scope.kind === "course" ? "course" : "selected");
    }
    setRunningPlanId(runId);
    setMonitoringDetachedPlanId(null);
    setError(null);
    setRunPlan(stages.map((stage) => ({
      id: `${runId}:${stage.id}`,
      label: stage.label,
      state: "queued",
      stage: stage.id,
    })));

    try {
      setRunPlan((current) => markPlanStep(current, stages[0]?.id ?? nextStartStage, "running"));
      const response = await studyPipelinePost<PipelinePlanResponse>(
        courseId,
        "/plan",
        planRequestBody(nextMode, nextStartStage, scope, {
          model: codexModels.selectedModel,
          reasoningEffort: codexModels.selectedReasoningEffort,
        }),
        runId,
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
      if (isUpstreamHeadersTimeout(runError)) {
        setMonitoringDetachedPlanId(runId);
        setRunPlan((current) => markRunningPlanStepWaitingForStatus(
          current,
          "Backend läuft weiter. Status wird neu geladen.",
        ));
        setError(formatStudyPipelineTimeout(runError));
      } else {
        setRunPlan((current) => markRunningPlanStepFailed(current, formatStudyPipelineError(runError)));
        handlePipelineActionError(runError, setError, setGateError);
      }
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
              {gate.kind === "ready" ? (
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GitBranch aria-hidden className="size-4" />
                  Pipeline
                </p>
              ) : null}
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
                {gate.kind === "ready" && course ? courseTitle(course) : "Pipeline"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {gate.kind === "ready" ? <StatusBadge loading={loading} liveWork={liveWork} status={status?.status} /> : null}
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

          {gate.kind === "ready" ? (
            <>
              <PipelineRunControl
                codexModel={codexModels.selectedModel}
                codexModelOptions={codexModels.models}
                codexConnected={codexModels.connected}
                codexConnecting={codexModels.connecting}
                codexDeviceCode={codexModels.deviceCode}
                codexError={codexModels.error}
                codexModelsLoading={codexModels.loading || codexModels.authChecking}
                disabled={Boolean(runningPlanId) || Boolean(monitoringDetachedPlanId) || loading}
                mode={runMode}
                onCodexConnect={() => void codexModels.connect()}
                onCodexModelChange={codexModels.setSelectedModel}
                onModeChange={setRunMode}
                onRun={() => void runPipelinePlan()}
                onScopeModeChange={setRunScopeMode}
                onStartStageChange={setRunStartStage}
                plan={runPlan}
                scopeMode={runScopeMode}
                selectedScope={displayedRunScope}
                startStage={runStartStage}
              />

              <CoursePipelineBlueprint
                extractedDocuments={extractedDocuments}
                inventory={inventory}
                onRerunExtraction={(engine) => void rerunExtracted(engine)}
                onRunNode={(request) => void runPipelinePlan(request)}
                onSelectedScopeChange={setSelectedScope}
                onSelectRun={(runId) => void selectActiveRun(runId)}
                rerunningEngine={rerunningEngine}
                runningNodeAction={Boolean(runningPlanId) || Boolean(monitoringDetachedPlanId) || loading}
                runs={runs}
                selectingRunId={selectingRunId}
                status={status}
                taskView={taskView}
                unavailable={{
                  extractedDocuments: unavailable.extractedDocuments,
                  runs: unavailable.runs,
                  taskView: unavailable.taskView,
                }}
              />
            </>
          ) : redirectingToConnect ? (
            <PipelineGatePanel gate={{ kind: "checking", message: "Opening Moodle connection." }} onRefresh={() => void loadInspectorData()} />
          ) : (
            <PipelineGatePanel gate={gate} onRefresh={() => void loadInspectorData()} />
          )}
        </div>
      </div>
    </section>
  );
}

function normalizeScopeForPlan(
  scope: BlueprintRunScope,
  stages: Array<{ id: PipelineStageId; label: string }>,
  inventory: CourseInventoryResponse | null,
): BlueprintRunScope {
  const includesCodex = stages.some((stage) => stage.id === "curated");
  if (!includesCodex || scope.kind !== "resource" || !inventory) {
    return scope;
  }
  const selectedKeys = new Set(scope.resourceIds.flatMap(resourceKeys));
  const matchingGroup = inventory.taskGroups.find((group) => {
    const groupResourceIds = [group.sheet.id, group.solution?.id].filter(Boolean) as string[];
    return groupResourceIds.some((resourceId) => resourceKeys(resourceId).some((key) => selectedKeys.has(key)));
  });
  if (!matchingGroup) {
    return scope;
  }
  return {
    kind: "task_group",
    label: matchingGroup.title,
    resourceIds: [matchingGroup.sheet.id, matchingGroup.solution?.id].filter(Boolean) as string[],
  };
}

function PipelineGatePanel({
  gate,
  onRefresh,
}: {
  gate: Exclude<ReturnType<typeof derivePipelineGate>, { kind: "ready" }>;
  onRefresh: () => void;
}) {
  if (gate.kind === "checking") {
    return (
      <section className="flex min-h-[28dvh] items-center justify-center px-4 py-10 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Checking access
        </p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <div className="flex max-w-2xl flex-col gap-3 rounded-3xl bg-destructive/10 px-4 py-4 text-destructive sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Pipeline blocked</p>
            <p className="mt-1 text-sm leading-6">{gate.message}</p>
          </div>
        </div>
        <Button className="w-full shrink-0 sm:w-fit" onClick={onRefresh} type="button" variant="secondary">
            <RefreshCw aria-hidden />
          Check again
        </Button>
      </div>
    </section>
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
  const payload = await response.json().catch(() => ({})) as { code?: string; error?: string; requestId?: string };
  if (!response.ok) {
    throw new StudyPipelineRequestError(
      payload.error ?? `Moodle study pipeline failed with ${response.status}.`,
      response.status,
      payload.code,
      payload.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }
  return payload as T;
}

async function studyPipelinePost<T>(courseId: string, suffix: string, body: unknown, requestId?: string): Promise<T> {
  const response = await fetch(
    `/api/study-pipeline/courses/${encodeURIComponent(courseId)}/study-pipeline${suffix}`,
    {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "X-Request-ID": requestId } : {}),
      },
      method: "POST",
    },
  );
  const payload = await response.json().catch(() => ({})) as { code?: string; error?: string; requestId?: string };
  if (!response.ok) {
    throw new StudyPipelineRequestError(
      payload.error ?? `Moodle study pipeline failed with ${response.status}.`,
      response.status,
      payload.code,
      payload.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }
  return payload as T;
}

async function loadTaskViewForInspector(courseId: string): Promise<TaskViewResponse> {
  const query = "includeScript=1";
  try {
    return await studyPipelineRequest<TaskViewResponse>(courseId, `/task-view?${query}`);
  } catch (pipelineError) {
    if (isPipelineGateError(pipelineError)) {
      throw pipelineError;
    }
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
  if (error instanceof StudyPipelineRequestError) {
    const parts = [error.message];
    const details = [
      error.code ? `code ${error.code}` : "",
      error.requestId ? `request ${error.requestId}` : "",
    ].filter(Boolean);
    if (details.length > 0) {
      parts.push(`(${details.join(", ")})`);
    }
    return parts.join(" ");
  }
  return error instanceof Error ? error.message : "Moodle study pipeline failed.";
}

function formatStudyPipelineTimeout(error: StudyPipelineRequestError): string {
  const suffix = error.requestId ? ` Request ${error.requestId}.` : "";
  return `Der Backend-Run läuft weiter, aber der Frontend-Proxy hat beim Warten auf die Antwort ein Timeout erreicht. Ich lade den Status neu.${suffix}`;
}

function isUpstreamHeadersTimeout(error: unknown): error is StudyPipelineRequestError {
  return error instanceof StudyPipelineRequestError && error.code === "upstream_headers_timeout";
}

class StudyPipelineRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

function handlePipelineActionError(
  error: unknown,
  setError: (message: string | null) => void,
  setGateError: (error: PipelineGateError | null) => void,
) {
  if (isPipelineGateError(error)) {
    setGateError(error);
    setError(null);
    return;
  }
  setError(formatStudyPipelineError(error));
}

function shouldRedirectToMoodleConnect(error: PipelineGateError): boolean {
  return (
    error.code === "unauthenticated" ||
    error.code === "moodle_not_connected" ||
    error.code === "moodle_session_expired" ||
    error.status === 401
  );
}
