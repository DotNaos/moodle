"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { AlertCircle, CheckCircle2, Database, FileText, GitBranch, Layers, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type {
  CourseInventoryNode,
  CourseInventoryResponse,
  StudyPipelineStatusResponse,
} from "@/components/study-pipeline-preview";
import { cn } from "@/lib/utils";

export type PipelineRunRecord = {
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
  artifactRefs?: Array<{
    id: string;
    kind: string;
    uri?: string;
    storageKey?: string;
    checksum?: string;
    pageNumber?: number;
    blockId?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type ActiveRunSelectionRecord = {
  sourceId: string;
  resourceId?: string;
  stage: string;
  activeRunId: string;
  selectedBy?: string;
  selectedAt: string;
  reason: string;
};

export type PipelineRunsResponse = {
  courseId: string;
  runs: PipelineRunRecord[];
  activeSelections: ActiveRunSelectionRecord[];
};

type BlueprintNodeTone = "source" | "process" | "resource" | "run" | "output" | "warning";

type BlueprintNodeData = {
  title: string;
  subtitle: string;
  detail: string;
  tone: BlueprintNodeTone;
  status?: string;
  active?: boolean;
  meta: Array<{ label: string; value: string }>;
};

type BlueprintNode = Node<BlueprintNodeData, "blueprint">;
type BlueprintNodeInput = Omit<BlueprintNode, "type"> & { type?: "blueprint" };

type CoursePipelineBlueprintProps = {
  inventory: CourseInventoryResponse | null;
  runs: PipelineRunsResponse | null;
  status: StudyPipelineStatusResponse | null;
};

const nodeTypes = {
  blueprint: BlueprintNodeCard,
};

const STAGE_LABELS: Record<string, string> = {
  inventory: "Inventory",
  raw: "Raw import",
  extracted: "Extracted",
  curated: "Codex curated",
};

export function CoursePipelineBlueprint({ inventory, runs, status }: CoursePipelineBlueprintProps) {
  const graph = useMemo(() => buildBlueprintGraph({ inventory, runs, status }), [inventory, runs, status]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0];

  return (
    <div className="grid min-h-[620px] gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-[560px] overflow-hidden rounded-3xl bg-secondary/45">
        <ReactFlow
          colorMode="light"
          edges={graph.edges}
          fitView
          maxZoom={1.4}
          minZoom={0.35}
          nodeTypes={nodeTypes}
          nodes={graph.nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          panOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d4d4d4" gap={22} />
          <Controls showInteractive={false} />
          <MiniMap
            className="hidden md:block"
            maskColor="rgba(255,255,255,0.72)"
            nodeColor={(node) => nodeColor((node.data as BlueprintNodeData).tone)}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      <aside className="rounded-3xl bg-secondary/45 px-4 py-4">
        {selectedNode ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selectedNode.data.tone === "warning" ? "destructive" : "secondary"}>
                {selectedNode.data.tone}
              </Badge>
              {selectedNode.data.status ? <Badge variant="outline">{selectedNode.data.status}</Badge> : null}
              {selectedNode.data.active ? <Badge>active</Badge> : null}
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">{selectedNode.data.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selectedNode.data.subtitle}</p>
            <p className="mt-4 text-sm leading-6 text-foreground/80">{selectedNode.data.detail}</p>
            <div className="mt-5 grid gap-2">
              {selectedNode.data.meta.map((item) => (
                <div className="rounded-2xl bg-background/70 px-3 py-2" key={`${selectedNode.id}:${item.label}`}>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 break-words text-xs font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a node to inspect its pipeline evidence.</p>
        )}
      </aside>
    </div>
  );
}

function BlueprintNodeCard({ data, selected }: NodeProps<BlueprintNode>) {
  const Icon = nodeIcon(data.tone);
  return (
    <div
      className={cn(
        "w-[220px] rounded-3xl bg-background px-4 py-3 shadow-sm transition-shadow",
        selected ? "shadow-[0_0_0_3px_rgba(0,0,0,0.18)]" : "shadow-black/5",
      )}
    >
      <Handle className="opacity-0" position={Position.Left} type="target" />
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", nodeToneClass(data.tone))}>
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{data.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{data.subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.active ? <Badge>active</Badge> : null}
        {data.status ? <Badge variant={data.status === "failed" ? "destructive" : "outline"}>{data.status}</Badge> : null}
      </div>
      <Handle className="opacity-0" position={Position.Right} type="source" />
    </div>
  );
}

export function buildBlueprintGraph({
  inventory,
  runs,
  status,
}: CoursePipelineBlueprintProps): { nodes: BlueprintNode[]; edges: Edge[] } {
  const nodes: BlueprintNode[] = [];
  const edges: Edge[] = [];
  const activeRunIds = new Set((runs?.activeSelections ?? []).map((selection) => selection.activeRunId));
  const latestRunsByStage = latestRuns(runs?.runs ?? []);
  const taskGroups = inventory?.taskGroups ?? [];
  const visibleTaskGroups = taskGroups.slice(0, 8);
  const warnings = buildWarnings(inventory, runs);

  addNode(nodes, {
    id: "course",
    position: { x: 0, y: 180 },
    data: {
      title: "Moodle course",
      subtitle: `${status?.summary.totalResources ?? inventory?.summary.totalResources ?? 0} resources`,
      detail: "The course is the shared source. Every downstream pipeline run should map back to this input.",
      tone: "source",
      status: status?.status,
      meta: [
        { label: "Course ID", value: status?.courseId ?? inventory?.courseId ?? "unknown" },
        { label: "Current stage", value: status?.stage || "not started" },
      ],
    },
  });
  addNode(nodes, {
    id: "inventory",
    position: { x: 280, y: 180 },
    data: {
      title: "Inventory",
      subtitle: inventory ? `${inventory.summary.taskGroups} task groups` : "not loaded",
      detail: "Classifies Moodle resources into task sheets, solutions, lecture material, interactions, references, and unknown items.",
      tone: "process",
      status: inventory ? "loaded" : "missing",
      meta: inventory
        ? [
            { label: "Lecture material", value: String(inventory.summary.lectureMaterial) },
            { label: "Task groups", value: String(inventory.summary.taskGroups) },
            { label: "Unknown", value: String(inventory.summary.unknown) },
          ]
        : [{ label: "State", value: "No inventory response loaded yet." }],
    },
  });
  addEdge(edges, "course", "inventory", "inventory");

  const bucketNodes = [
    { id: "bucket-tasks", title: "Task groups", count: taskGroups.length, y: 40 },
    { id: "bucket-lecture", title: "Lecture material", count: inventory?.lectureMaterial.length ?? 0, y: 180 },
    { id: "bucket-review", title: "Review inputs", count: warnings.length, y: 320 },
  ];
  for (const bucket of bucketNodes) {
    addNode(nodes, {
      id: bucket.id,
      position: { x: 560, y: bucket.y },
      data: {
        title: bucket.title,
        subtitle: `${bucket.count} item${bucket.count === 1 ? "" : "s"}`,
        detail: "A classified bucket groups resources before extraction and curation decide what becomes user-facing content.",
        tone: bucket.id === "bucket-review" ? "warning" : "resource",
        status: bucket.count > 0 ? "has data" : "empty",
        meta: [{ label: "Count", value: String(bucket.count) }],
      },
    });
    addEdge(edges, "inventory", bucket.id, bucket.id === "bucket-review" ? "review" : "classified");
  }

  visibleTaskGroups.forEach((group, index) => {
    const nodeId = `task-group-${group.id}`;
    addNode(nodes, {
      id: nodeId,
      position: { x: 860, y: index * 120 },
      data: {
        title: group.title,
        subtitle: group.solution ? "sheet + solution" : group.pairingStatus.replaceAll("_", " "),
        detail: group.pairingReason || "Task group created from classified Moodle resources.",
        tone: group.solution ? "resource" : "warning",
        status: group.pairingStatus,
        meta: [
          { label: "Sheet", value: group.sheet.name },
          { label: "Solution", value: group.solution?.name ?? "missing" },
          { label: "Confidence", value: group.pairingConfidence || "unknown" },
        ],
      },
    });
    addEdge(edges, "bucket-tasks", nodeId, "contains");
  });

  const runStages = ["inventory", "raw", "extracted", "curated"];
  runStages.forEach((stage, index) => {
    const run = latestRunsByStage.get(stage);
    const x = 1160 + index * 280;
    addNode(nodes, {
      id: `run-${stage}`,
      position: { x, y: 180 },
      data: {
        title: STAGE_LABELS[stage] ?? stage,
        subtitle: run ? `${run.engine} · ${run.configHash}` : "no stored run",
        detail: run
          ? `Latest ${stage} run recorded at ${formatDateTime(run.createdAt)}.`
          : "This stage has no immutable run record yet.",
        tone: "run",
        status: run?.status ?? (status?.stage === stage ? status.status : "missing"),
        active: run ? activeRunIds.has(run.id) : false,
        meta: run
          ? [
              { label: "Run ID", value: run.id },
              { label: "Engine", value: run.engine },
              { label: "Ownership", value: run.ownership },
              { label: "Artifact root", value: run.artifactRoot || "none" },
            ]
          : [{ label: "State", value: "No run stored for this stage." }],
      },
    });
    addEdge(edges, index === 0 ? "inventory" : `run-${runStages[index - 1]}`, `run-${stage}`, run?.status ?? "pending");
  });

  addNode(nodes, {
    id: "outputs",
    position: { x: 2280, y: 180 },
    data: {
      title: "Final outputs",
      subtitle: `${status?.summary.tasks ?? 0} tasks · ${status?.summary.scripts ?? 0} scripts`,
      detail: "User-facing tasks, scripts, formulas, and source-linked content should only appear here if traceable upstream nodes exist.",
      tone: "output",
      status: status?.stage === "curated" ? "ready" : "pending",
      meta: [
        { label: "Tasks", value: String(status?.summary.tasks ?? 0) },
        { label: "Linked solutions", value: String(status?.summary.linkedSolutions ?? 0) },
        { label: "Missing solutions", value: String(status?.summary.missingSolutions ?? 0) },
      ],
    },
  });
  addEdge(edges, "run-curated", "outputs", "publishes");

  warnings.slice(0, 5).forEach((warning, index) => {
    const nodeId = `warning-${index}`;
    addNode(nodes, {
      id: nodeId,
      position: { x: 1160 + index * 250, y: 430 },
      data: warning,
    });
    addEdge(edges, warning.sourceId, nodeId, "needs review");
  });

  return { nodes, edges };
}

function buildWarnings(
  inventory: CourseInventoryResponse | null,
  runs: PipelineRunsResponse | null,
): Array<BlueprintNodeData & { sourceId: string }> {
  const missingSolutions = inventory?.taskGroups
    .filter((group) => group.pairingStatus !== "paired")
    .map((group) => ({
      sourceId: "bucket-review",
      title: group.title,
      subtitle: group.pairingStatus.replaceAll("_", " "),
      detail: group.pairingReason || "This task group needs review before it can be trusted.",
      tone: "warning" as const,
      status: group.pairingStatus,
      meta: [
        { label: "Sheet", value: group.sheet.name },
        { label: "Solution", value: group.solution?.name ?? "missing" },
      ],
    })) ?? [];
  const unknownResources = inventory?.unknown.slice(0, 4).map((item) => warningFromInventoryNode(item)) ?? [];
  const failedRuns = runs?.runs
    .filter((run) => run.status === "failed")
    .slice(0, 4)
    .map((run) => ({
      sourceId: `run-${run.stage}`,
      title: `${STAGE_LABELS[run.stage] ?? run.stage} failed`,
      subtitle: run.engine,
      detail: run.error || "The run failed without a recorded error message.",
      tone: "warning" as const,
      status: "failed",
      meta: [
        { label: "Run ID", value: run.id },
        { label: "Created", value: formatDateTime(run.createdAt) },
      ],
    })) ?? [];

  return [...missingSolutions, ...unknownResources, ...failedRuns];
}

function warningFromInventoryNode(item: CourseInventoryNode): BlueprintNodeData & { sourceId: string } {
  return {
    sourceId: "bucket-review",
    title: item.name,
    subtitle: "unknown resource",
    detail: item.reason || "No confident bucket matched this resource.",
    tone: "warning",
    status: item.confidence ? `${item.confidence} confidence` : "unknown",
    meta: [
      { label: "Resource ID", value: item.id },
      { label: "Section", value: item.sectionName || "unknown section" },
    ],
  };
}

function latestRuns(runs: PipelineRunRecord[]): Map<string, PipelineRunRecord> {
  const result = new Map<string, PipelineRunRecord>();
  for (const run of runs) {
    const existing = result.get(run.stage);
    if (!existing || new Date(run.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      result.set(run.stage, run);
    }
  }
  return result;
}

function addNode(nodes: BlueprintNode[], node: BlueprintNodeInput) {
  nodes.push({ ...node, type: "blueprint" });
}

function addEdge(edges: Edge[], source: string, target: string, label: string) {
  edges.push({
    id: `${source}->${target}`,
    source,
    target,
    label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: label === "failed" || label === "needs review" ? "#dc2626" : "#737373", strokeWidth: 2 },
    type: "smoothstep",
  });
}

function nodeIcon(tone: BlueprintNodeTone) {
  if (tone === "source") return Database;
  if (tone === "process") return Layers;
  if (tone === "resource") return FileText;
  if (tone === "run") return Search;
  if (tone === "output") return CheckCircle2;
  if (tone === "warning") return AlertCircle;
  return GitBranch;
}

function nodeToneClass(tone: BlueprintNodeTone): string {
  if (tone === "warning") return "bg-destructive/10 text-destructive";
  if (tone === "run") return "bg-primary text-primary-foreground";
  if (tone === "output") return "bg-emerald-500/10 text-emerald-700";
  if (tone === "process") return "bg-sky-500/10 text-sky-700";
  if (tone === "resource") return "bg-amber-500/10 text-amber-700";
  return "bg-secondary text-muted-foreground";
}

function nodeColor(tone: BlueprintNodeTone): string {
  if (tone === "warning") return "#dc2626";
  if (tone === "run") return "#171717";
  if (tone === "output") return "#047857";
  if (tone === "process") return "#0369a1";
  if (tone === "resource") return "#b45309";
  return "#737373";
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
