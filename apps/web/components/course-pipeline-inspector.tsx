"use client";

import { AlertCircle, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  CoursePipelineBlueprint,
  type PipelineRunsResponse,
} from "@/components/course-pipeline-blueprint";
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

  const liveWork = useMemo(
    () => hasPipelineLiveWork({
      actionIds: [selectingRunId, rerunningEngine],
      runs,
      status,
    }),
    [rerunningEngine, runs, selectingRunId, status],
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

          <CoursePipelineBlueprint
            extractedDocuments={extractedDocuments}
            inventory={inventory}
            onRerunExtraction={(engine) => void rerunExtracted(engine)}
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
