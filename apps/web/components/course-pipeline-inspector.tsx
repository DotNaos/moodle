"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  RotateCcw,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  buildInventorySections,
  type CourseInventoryResponse,
  type StudyPipelineStatusResponse,
} from "@/components/study-pipeline-preview";
import type { Course, Material } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type InspectorTab = "resources" | "buckets" | "runs" | "blueprint" | "review";

type PipelineRunRecord = {
  id: string;
  sourceId: string;
  courseId: string;
  resourceId?: string;
  fileHash?: string;
  stage: string;
  engine: string;
  configHash: string;
  ownership: "shared" | "user_owned" | string;
  createdBy?: string;
  status: string;
  artifactRoot: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  artifactRefs?: Array<{ id: string; kind: string; uri?: string; storageKey?: string }>;
};

type ActiveRunSelectionRecord = {
  sourceId: string;
  resourceId?: string;
  stage: string;
  activeRunId: string;
  selectedBy?: string;
  selectedAt: string;
  reason: string;
};

type PipelineRunsResponse = {
  courseId: string;
  runs: PipelineRunRecord[];
  activeSelections: ActiveRunSelectionRecord[];
};

type CoursePipelineInspectorProps = {
  course: Course;
  courseId: string;
  materials: Material[];
  materialsLoading: boolean;
};

const INSPECTOR_TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: "resources", label: "Resources" },
  { id: "buckets", label: "Buckets" },
  { id: "runs", label: "Runs" },
  { id: "blueprint", label: "Blueprint" },
  { id: "review", label: "Review" },
];

export function CoursePipelineInspector({
  course,
  courseId,
  materials,
  materialsLoading,
}: CoursePipelineInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("resources");
  const [inventory, setInventory] = useState<CourseInventoryResponse | null>(null);
  const [status, setStatus] = useState<StudyPipelineStatusResponse | null>(null);
  const [runs, setRuns] = useState<PipelineRunsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectingRunId, setSelectingRunId] = useState<string | null>(null);

  const inventorySections = useMemo(() => buildInventorySections(inventory), [inventory]);
  useEffect(() => {
    void loadInspectorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function loadInspectorData() {
    setLoading(true);
    setError(null);
    try {
      const [statusResult, inventoryResult, runsResult] = await Promise.allSettled([
        studyPipelineRequest<StudyPipelineStatusResponse>(courseId, ""),
        studyPipelineRequest<CourseInventoryResponse>(courseId, "/inventory"),
        studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs"),
      ]);
      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
      }
      if (inventoryResult.status === "fulfilled") {
        setInventory(inventoryResult.value);
      }
      if (runsResult.status === "fulfilled") {
        setRuns(runsResult.value);
      }
      const failed = [statusResult, inventoryResult, runsResult].find((result) => result.status === "rejected");
      if (failed?.status === "rejected") {
        setError(formatStudyPipelineError(failed.reason));
      }
    } catch (loadError) {
      setError(formatStudyPipelineError(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function selectActiveRun(runId: string) {
    setSelectingRunId(runId);
    setError(null);
    try {
      await studyPipelinePost(courseId, `/runs/${encodeURIComponent(runId)}/select`, {
        reason: "selected in course pipeline inspector",
      });
      const nextRuns = await studyPipelineRequest<PipelineRunsResponse>(courseId, "/runs");
      setRuns(nextRuns);
    } catch (selectError) {
      setError(formatStudyPipelineError(selectError));
    } finally {
      setSelectingRunId(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:h-full">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 md:py-7">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GitBranch aria-hidden className="size-4" />
                Pipeline
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{courseTitle(course)}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Course-level inspection surface for Moodle resources, classification, runs, blueprint, and review state.
              </p>
            </div>
            <Button disabled={loading} onClick={() => void loadInspectorData()} type="button" variant="secondary">
              {loading ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
              Refresh
            </Button>
          </header>

          <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary p-1">
            {INSPECTOR_TABS.map((tab) => (
              <button
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-3xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {activeTab === "resources" ? (
            <ResourcesTab
              inventory={inventory}
              loading={materialsLoading}
              materials={materials}
            />
          ) : activeTab === "buckets" ? (
            <BucketsTab sections={inventorySections} />
          ) : activeTab === "runs" ? (
            <RunsTab
              loading={loading}
              onSelectRun={(runId) => void selectActiveRun(runId)}
              runs={runs}
              selectingRunId={selectingRunId}
              status={status}
            />
          ) : activeTab === "blueprint" ? (
            <BlueprintTab inventory={inventory} status={status} />
          ) : (
            <ReviewTab inventory={inventory} />
          )}
        </div>
      </div>
    </section>
  );
}

function ResourcesTab({
  inventory,
  loading,
  materials,
}: {
  inventory: CourseInventoryResponse | null;
  loading: boolean;
  materials: Material[];
}) {
  const nodes = [
    ...(inventory?.lectureMaterial ?? []),
    ...(inventory?.references ?? []),
    ...(inventory?.interactions ?? []),
    ...(inventory?.unknown ?? []),
    ...(inventory?.ignoredAllowed ?? []),
    ...(inventory?.taskGroups.flatMap((group) => [
      group.sheet,
      ...(group.solution ? [group.solution] : []),
      ...(group.solutionCandidates ?? []),
    ]) ?? []),
  ];
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));

  if (loading && materials.length === 0) {
    return <LoadingPanel label="Resources loading" />;
  }

  return (
    <div className="grid gap-2">
      {materials.map((material) => {
        const node = nodesById.get(material.id);
        return (
          <div className="grid gap-3 rounded-3xl bg-secondary/45 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]" key={material.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{material.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {material.sectionName || "No section"} · {material.type || material.fileType || "resource"}
              </p>
              {node?.reason ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{node.reason}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge>{node?.bucket ?? "not classified"}</Badge>
              {node?.confidence ? <Badge variant="outline">{confidenceLabel(node.confidence)}</Badge> : null}
            </div>
          </div>
        );
      })}
      {materials.length === 0 ? (
        <EmptyInspectorState
          icon={FileText}
          title="No resources loaded"
          description="Open a course with Moodle materials to inspect the first pipeline source layer."
        />
      ) : null}
    </div>
  );
}

function BucketsTab({ sections }: { sections: ReturnType<typeof buildInventorySections> }) {
  if (sections.length === 0) {
    return (
      <EmptyInspectorState
        icon={Layers}
        title="No inventory buckets yet"
        description="Refresh after the course inventory endpoint has returned classification data."
      />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {sections.map((section) => (
        <section className="rounded-3xl bg-secondary/45 px-4 py-4" key={section.id}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
            <Badge variant="outline">{section.items.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {section.items.slice(0, 12).map((item) => (
              <div className="rounded-2xl bg-background/70 px-3 py-2" key={`${section.id}:${item.id}`}>
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.reason || `Classified as ${item.bucket}.`}
                </p>
              </div>
            ))}
            {section.items.length > 12 ? (
              <p className="px-1 text-xs text-muted-foreground">+{section.items.length - 12} more resources</p>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function RunsTab({
  loading,
  onSelectRun,
  runs,
  selectingRunId,
  status,
}: {
  loading: boolean;
  onSelectRun: (runId: string) => void;
  runs: PipelineRunsResponse | null;
  selectingRunId: string | null;
  status: StudyPipelineStatusResponse | null;
}) {
  const activeRunIds = new Set((runs?.activeSelections ?? []).map((selection) => selection.activeRunId));
  if (loading && !runs && !status) {
    return <LoadingPanel label="Runs loading" />;
  }
  if (!runs || runs.runs.length === 0) {
    return (
      <EmptyInspectorState
        icon={RefreshCw}
        title="No pipeline runs stored"
        description="Request tasks or run a pipeline stage to create the first immutable run record."
      />
    );
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Current status" value={status?.status ?? "unknown"} />
        <Metric label="Current stage" value={status?.stage || "not started"} />
        <Metric label="Stored runs" value={String(runs.runs.length)} />
        <Metric label="Active selections" value={String(runs.activeSelections.length)} />
      </div>
      <div className="grid gap-2">
        {runs.runs.map((run) => {
          const active = activeRunIds.has(run.id);
          return (
            <div className="grid gap-3 rounded-3xl bg-secondary/45 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]" key={run.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{run.stage}</p>
                  <Badge variant={run.status === "failed" ? "destructive" : active ? "default" : "secondary"}>
                    {active ? "active" : run.status}
                  </Badge>
                  <Badge variant="outline">{run.ownership === "user_owned" ? "user-owned" : "shared"}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {run.engine} · {run.configHash} · {formatDateTime(run.createdAt)}
                </p>
                {run.fileHash ? <p className="mt-1 truncate text-xs text-muted-foreground">File hash: {run.fileHash}</p> : null}
                {run.error ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-destructive">{run.error}</p> : null}
                <p className="mt-2 truncate text-[11px] text-muted-foreground/80">{run.id}</p>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Button
                  disabled={active || selectingRunId === run.id}
                  onClick={() => onSelectRun(run.id)}
                  type="button"
                  variant="secondary"
                >
                  {selectingRunId === run.id ? <Spinner aria-hidden /> : <RotateCcw aria-hidden />}
                  {active ? "Aktiv" : "Als aktiv setzen"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlueprintTab({
  inventory,
  status,
}: {
  inventory: CourseInventoryResponse | null;
  status: StudyPipelineStatusResponse | null;
}) {
  const nodes = [
    { label: "Moodle source", detail: `${status?.summary.totalResources ?? inventory?.summary.totalResources ?? 0} resources`, icon: FileText },
    { label: "Inventory", detail: inventory ? `${inventory.summary.taskGroups} task groups` : "not loaded", icon: Layers },
    { label: "Extracted", detail: status?.stage === "extracted" ? "ready" : "pending or unknown", icon: Search },
    { label: "Codex", detail: status?.stage === "curated" ? "curated output ready" : "not curated", icon: Sparkles },
    { label: "Review", detail: "review queue placeholder", icon: CheckCircle2 },
  ];
  return (
    <div className="overflow-x-auto rounded-3xl bg-secondary/45 p-4">
      <div className="grid min-w-[760px] grid-cols-[repeat(5,minmax(130px,1fr))] items-center gap-3">
        {nodes.map((node, index) => (
          <div className="flex items-center gap-3" key={node.label}>
            <div className="min-w-0 flex-1 rounded-3xl bg-background/75 px-4 py-4">
              <node.icon aria-hidden className="mb-3 size-5 text-muted-foreground" />
              <p className="truncate text-sm font-semibold text-foreground">{node.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{node.detail}</p>
            </div>
            {index < nodes.length - 1 ? <div className="h-px w-8 shrink-0 bg-border" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewTab({
  inventory,
}: {
  inventory: CourseInventoryResponse | null;
}) {
  const reviewItems = [
    ...(inventory?.taskGroups.filter((group) => group.pairingStatus !== "paired").map((group) => ({
      id: group.id,
      title: group.title,
      detail: group.pairingReason,
      state: group.pairingStatus === "missing_solution" ? "Missing solution" : "Ambiguous solution",
    })) ?? []),
    ...(inventory?.unknown.map((item) => ({
      id: item.id,
      title: item.name,
      detail: item.reason || "No confident inventory bucket matched.",
      state: "Unknown resource",
    })) ?? []),
  ];

  if (reviewItems.length === 0) {
    return (
      <EmptyInspectorState
        icon={CheckCircle2}
        title="No review items"
        description="Missing solutions, ambiguous pairs, and unknown resources will appear here."
      />
    );
  }

  return (
    <div className="grid gap-2">
      {reviewItems.map((item) => (
        <div className="rounded-3xl bg-secondary/45 px-4 py-3" key={item.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </div>
            <Badge variant="destructive">{item.state}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-secondary/45 px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-3xl bg-secondary/45 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        {label}
      </span>
    </div>
  );
}

function EmptyInspectorState({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof FileQuestion;
  title: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-3xl bg-secondary/45 px-6 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-background text-muted-foreground">
          <Icon aria-hidden className="size-5" />
        </span>
        <p className="mt-4 font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function confidenceLabel(confidence: string): string {
  if (confidence === "high") {
    return "high confidence";
  }
  if (confidence === "medium") {
    return "medium confidence";
  }
  if (confidence === "low") {
    return "low confidence";
  }
  return confidence || "unknown confidence";
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

function formatStudyPipelineError(error: unknown): string {
  return error instanceof Error ? error.message : "Moodle study pipeline failed.";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "unknown time";
  }
  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}
