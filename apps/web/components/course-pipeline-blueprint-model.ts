import { MarkerType, type Edge, type Node } from "@xyflow/react";

import type {
  CourseInventoryNode,
  CourseInventoryResponse,
  CourseInventoryTaskGroup,
  StudyPipelineStatusResponse,
} from "@/components/study-pipeline-preview";
import type { ExtractedDocumentsResponse } from "@/components/extracted-document-inspector";
import type { TaskViewResponse } from "@/components/task-study-panel";
import {
  addReviewLane,
  addScriptLane,
  addScriptGroupCollection,
  addTaskGroupLane,
  buildTaskGroupProgressItems,
  buildRunLookup,
  buildWarnings,
} from "@/components/course-pipeline-blueprint-lanes";
import { courseLiveState } from "@/components/course-pipeline-live-state";

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
  diagnostics?: Array<{
    code?: string;
    createdAt?: string;
    level: "error" | "info" | "warning" | string;
    message: string;
    stage?: string;
  }>;
  curationChecklist?: PipelineRunCurationChecklist;
  elementDecisions?: PipelineRunElementDecision[];
  logs?: string[];
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

export type PipelineRunElementDecision = {
  id?: string;
  sourceElementId?: string;
  sourceArtifactId?: string;
  sourceAssetId?: string;
  sourcePageImageArtifactId?: string;
  outputArtifactId?: string;
  elementKind?: string;
  outcome: string;
  reason?: string;
  decidedBy?: string;
  confidence?: string;
  pageNumber?: number;
  createdAt?: string;
};

export type PipelineRunCurationChecklist = {
  status: string;
  checkedBy?: string;
  checkedAt?: string;
  renderPreviewArtifactId?: string;
  items: Array<{
    id: string;
    label: string;
    status: string;
    evidenceArtifactId?: string;
    reason?: string;
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

export type BlueprintNodeTone = "source" | "process" | "resource" | "run" | "output" | "warning";
export type BlueprintStepKind = "transform" | "split" | "collect";
export type BlueprintProblemSeverity = "warning" | "error";

export type BlueprintProblem = {
  label: string;
  detail: string;
  severity: BlueprintProblemSeverity;
};

export type BlueprintPort = {
  cardinality?: "array" | "optional" | "single";
  label: string;
  detail?: string;
  state?: string;
  valueType?: string;
};

export type BlueprintCompileIssue = {
  detail: string;
  edgeId: string;
  label: string;
  severity: BlueprintProblemSeverity;
  sourceId: string;
  targetId: string;
};

export type BlueprintHiddenItem = {
  id: string;
  title: string;
  selected: boolean;
};

export type BlueprintProgressItem = {
  id: string;
  title: string;
  detail?: string;
  status: "done" | "failed" | "loading" | "missing" | "needs_review" | "pending";
  selected?: boolean;
};

export type BlueprintRenderedField = {
  label: string;
  path: string;
  type: "json" | "markdown" | "text";
  value: string;
  description?: string;
};

export type BlueprintExtractionVariant = {
  active: boolean;
  artifactCount: number;
  chars: number | null;
  configHash: string;
  engine: string;
  preview: string;
  runId?: string;
  status: "active" | "failed" | "missing" | "ok" | "stale" | "weak";
};

export type BlueprintLiveState = {
  status: "failed" | "queued" | "running" | "stale" | "succeeded" | "warning" | "needs_review";
  label: string;
  detail?: string;
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  current?: boolean;
};

export type BlueprintRunScope = {
  kind: "course" | "resource" | "task_group";
  label: string;
  resourceIds: string[];
};

export type BlueprintRunStage = "inventory" | "raw" | "extracted" | "curated";

export type BlueprintRunRequest = {
  mode: "from" | "single";
  scope: BlueprintRunScope;
  startStage: BlueprintRunStage;
};

export type BlueprintFunctionKind = "script-output-map" | "task-output-map";

export type BlueprintCodexModelOption = {
  id: string;
  label?: string;
};

export type BlueprintCodexConfig = {
  connected: boolean;
  connecting: boolean;
  deviceCode: {
    userCode: string;
    verificationUri: string;
  } | null;
  error: string | null;
  loading: boolean;
  modelOptions: BlueprintCodexModelOption[];
  onConnect: () => void;
  onModelChange: (model: string) => void;
  selectedModel: string;
};

export type BlueprintNodeData = {
  title: string;
  subtitle: string;
  detail: string;
  tone: BlueprintNodeTone;
  stepKind: BlueprintStepKind;
  status?: string;
  active?: boolean;
  artifacts?: string[];
  bodyData?: unknown;
  config?: Array<{ label: string; value: string }>;
  evidence?: string[];
  hiddenItems?: BlueprintHiddenItem[];
  progressItems?: BlueprintProgressItem[];
  inputs: BlueprintPort[];
  meta: Array<{ label: string; value: string }>;
  live?: BlueprintLiveState;
  codexConfig?: BlueprintCodexConfig;
  onSelect?: (nodeId: string) => void;
  onToggleHiddenItem?: (itemId: string) => void;
  onRunFromNode?: (request: BlueprintRunRequest) => void;
  onOpenFunction?: (kind: BlueprintFunctionKind) => void;
  outputPreview?: string;
  outputs: BlueprintPort[];
  problems?: BlueprintProblem[];
  renderedFields?: BlueprintRenderedField[];
  runScope?: BlueprintRunScope;
  runActionDisabled?: boolean;
  runActionRunning?: boolean;
  extractionVariants?: BlueprintExtractionVariant[];
  frame?: {
    height: number;
    variant?: "group" | "stage";
    width: number;
  };
};

export type BlueprintNode = Node<BlueprintNodeData, "blueprint">;
export type BlueprintFrameNode = Node<BlueprintNodeData, "frame">;
export type BlueprintGraphNode = BlueprintNode | BlueprintFrameNode;
type BlueprintNodeInput = Omit<BlueprintNode, "type"> & { type?: "blueprint" };
type BlueprintFrameInput = Omit<BlueprintFrameNode, "type"> & { type?: "frame" };

export type ExtractedLookup = {
  byResourceId: Map<string, ExtractedDocumentsResponse["documents"][number]>;
  response: ExtractedDocumentsResponse | null;
};

export type TaskOutputRecord = TaskViewResponse["sheets"][number]["tasks"][number] & {
  sheetTitle: string;
  solutionMarkdown?: string;
  solutionResourceId?: string;
  solutionTitle?: string;
};

export type ScriptOutputRecord = NonNullable<TaskViewResponse["scriptSections"]>[number];

export type OutputLookup = {
  byResourceId: Map<string, TaskOutputRecord[]>;
  scriptSectionsByResourceId: Map<string, ScriptOutputRecord[]>;
  taskView: TaskViewResponse | null;
  totalOutputs: number;
  totalScriptSections: number;
  totalTasks: number;
};

type CoursePipelineBlueprintModelInput = {
  extractedDocuments: ExtractedDocumentsResponse | null;
  inventory: CourseInventoryResponse | null;
  runs: PipelineRunsResponse | null;
  status: StudyPipelineStatusResponse | null;
  taskView: TaskViewResponse | null;
  selectedTaskGroupIds?: string[];
  unavailable?: {
    extractedDocuments?: string;
    inventory?: string;
    runs?: string;
    taskView?: string;
  };
};

const MAX_SCRIPT_GROUPS = 3;

const STAGE_LABELS: Record<string, string> = {
  inventory: "Inventory",
  raw: "Raw import",
  extracted: "Extracted",
  curated: "Codex curated",
  extract_text: "Text extraction",
  codex_curate: "Codex transform",
};

export function buildBlueprintGraph({
  extractedDocuments,
  inventory,
  runs,
  status,
  selectedTaskGroupIds,
  taskView,
  unavailable,
}: CoursePipelineBlueprintModelInput): { nodes: BlueprintGraphNode[]; edges: Edge[] } {
  const nodes: BlueprintGraphNode[] = [];
  const edges: Edge[] = [];
  const activeRunIds = new Set((runs?.activeSelections ?? []).map((selection) => selection.activeRunId));
  const runLookup = buildRunLookup(runs?.runs ?? [], runs?.activeSelections ?? []);
  const extractedLookup = buildExtractedLookup(extractedDocuments);
  const outputLookup = buildOutputLookup(taskView);
  const derivedInventory = inventory ?? inventoryFromStatus(status);
  const usingDerivedInventory = !inventory && Boolean(derivedInventory);
  const taskGroups = sortTaskGroups(derivedInventory?.taskGroups ?? []);
  const scriptResources = sortInventoryNodes(derivedInventory?.lectureMaterial ?? []);
  const visibleTaskGroups = visibleTaskGroupItems(taskGroups, selectedTaskGroupIds ?? []);
  const visibleScriptResources = scriptResources.slice(0, MAX_SCRIPT_GROUPS);
  const selectedTaskGroup = visibleTaskGroups[0] ?? null;
  const taskGroupProgressItems = selectedTaskGroup
    ? buildTaskGroupProgressItems({
        extractedLookup,
        groups: taskGroups,
        outputLookup,
        runLookup,
        selectedGroupId: selectedTaskGroup.id,
      })
    : [];
  const scriptProgressItems = buildScriptProgressItems({ outputLookup, resources: scriptResources, runLookup });
  const totalResources = status?.summary.totalResources ?? derivedInventory?.summary.totalResources ?? 0;
  const centerY = 760;
  const taskLaneGap = 720;
  const taskLaneStartY = centerY - ((Math.max(visibleTaskGroups.length, 1) - 1) * taskLaneGap) / 2;
  const scriptLaneY = taskLaneStartY + Math.max(visibleTaskGroups.length, 1) * taskLaneGap + 200;

  addNode(nodes, {
    id: "course",
    position: { x: 0, y: centerY },
    data: {
      title: "Course",
      subtitle: `${totalResources} resources`,
      detail: "The Moodle course is the only initial input. Every generated task or script section must trace back to this source.",
      evidence: [
        "Initial input: Moodle course id",
        `${totalResources} Moodle resources reported`,
        runs ? `${runs.runs.length} immutable runs loaded` : `Run history missing${unavailable?.runs ? `: ${unavailable.runs}` : ""}`,
        extractedDocuments ? `${extractedDocuments.summary.totalDocuments} extracted documents loaded` : `Extracted documents missing${unavailable?.extractedDocuments ? `: ${unavailable.extractedDocuments}` : ""}`,
        taskView ? `${outputLookup.totalTasks} task outputs and ${outputLookup.totalScriptSections} script sections loaded` : `Task view missing${unavailable?.taskView ? `: ${unavailable.taskView}` : ""}`,
      ],
      inputs: [{ label: "course_id", detail: status?.courseId ?? inventory?.courseId ?? "unknown" }],
      bodyData: {
        courseId: status?.courseId ?? derivedInventory?.courseId ?? "unknown",
        status: status?.status ?? "not_started",
        currentStage: status?.stage ?? null,
        summary: {
          totalResources,
          extractedDocuments: extractedDocuments?.summary.totalDocuments ?? null,
          immutableRuns: runs?.runs.length ?? null,
          taskOutputs: outputLookup.totalTasks,
          scriptOutputs: outputLookup.totalScriptSections,
        },
      },
      outputPreview: `${outputLookup.totalTasks} task output(s) loaded\n${outputLookup.totalScriptSections} script section output(s) loaded\n${totalResources} Moodle resource(s) traced from the course input`,
      outputs: [{ label: "course source", detail: `${totalResources} resources` }],
      stepKind: "transform",
      tone: "source",
      status: status?.status ?? "not_started",
      live: courseLiveState(status),
      meta: [
        { label: "Course ID", value: status?.courseId ?? derivedInventory?.courseId ?? "unknown" },
        { label: "Current stage", value: status?.stage || "not started" },
        { label: "Runs", value: runs ? String(runs.runs.length) : "missing" },
        { label: "Extracted docs", value: extractedDocuments ? String(extractedDocuments.summary.totalDocuments) : "missing" },
        { label: "Outputs", value: taskView ? String(outputLookup.totalOutputs) : "missing" },
      ],
      problems: buildRootProblems({ extractedDocuments, runs, taskView, unavailable }),
      runScope: { kind: "course", label: "Whole course", resourceIds: [] },
    },
  });

  addNode(nodes, {
    id: "resource-set",
    position: { x: 680, y: centerY },
    data: {
      title: "Resource Set",
      subtitle: `${totalResources} resources`,
      detail: "Loads and normalizes the Moodle resource list before any task or script content is generated.",
      evidence: derivedInventory
        ? [
            `${derivedInventory.summary.taskGroups} task groups`,
            `${derivedInventory.summary.lectureMaterial} lecture resources`,
            `${derivedInventory.summary.unknown} unknown resources`,
            usingDerivedInventory
              ? `Inventory endpoint unavailable; graph derived from pipeline status materials${unavailable?.inventory ? ` (${unavailable.inventory})` : ""}.`
              : "Inventory endpoint available.",
          ]
        : [`Inventory response is missing${unavailable?.inventory ? `: ${unavailable.inventory}` : ""}`],
      inputs: [{ label: "course source", detail: "Moodle course resources" }],
      bodyData: resourceSetBodyData({
        inventory: derivedInventory,
        source: usingDerivedInventory ? "pipeline_status_fallback" : inventory ? "inventory" : "missing",
        unavailableReason: unavailable?.inventory,
        warnings: buildWarnings(derivedInventory, runs),
      }),
      outputPreview: inventory
        ? `Task groups: ${inventory.summary.taskGroups}\nLecture resources: ${inventory.summary.lectureMaterial}\nUnknown: ${inventory.summary.unknown}`
        : derivedInventory
          ? `Task groups: ${derivedInventory.summary.taskGroups}\nLecture resources: ${derivedInventory.summary.lectureMaterial}\nUnknown: ${derivedInventory.summary.unknown}\nSource: derived from status`
          : "No inventory response loaded yet.",
      outputs: [
        { cardinality: "array", label: "task groups[]", detail: String(derivedInventory?.summary.taskGroups ?? 0), valueType: "TaskGroup" },
        { cardinality: "array", label: "script groups[]", detail: String(derivedInventory?.summary.lectureMaterial ?? 0), valueType: "ScriptGroup" },
        { cardinality: "array", label: "review items[]", detail: String(buildWarnings(derivedInventory, runs).length), valueType: "ReviewItem" },
      ],
      problems: inventory || derivedInventory
        ? usingDerivedInventory
          ? [{
              label: "Inventory endpoint missing",
              detail: unavailable?.inventory ?? "The graph is using pipeline status materials as a fallback.",
              severity: "warning",
            }]
          : undefined
        : [{
            label: "Inventory missing",
            detail: unavailable?.inventory ?? "The resource classification response is not available.",
            severity: "warning",
          }],
      stepKind: "split",
      tone: "process",
      status: inventory ? "loaded" : derivedInventory ? "derived" : "missing",
      meta: derivedInventory
        ? [
            { label: "Task groups", value: String(derivedInventory.summary.taskGroups) },
            { label: "Lecture material", value: String(derivedInventory.summary.lectureMaterial) },
            { label: "Unknown", value: String(derivedInventory.summary.unknown) },
            { label: "Source", value: usingDerivedInventory ? "status fallback" : "inventory" },
          ]
        : [{ label: "State", value: "No inventory response loaded yet." }],
      runScope: { kind: "course", label: "Whole course", resourceIds: [] },
    },
  });
  addEdge(edges, "course", "resource-set", "1 -> 1", { edgeType: "straight" });

  addFrame(nodes, {
    id: "task-groups-frame",
    position: { x: 1360, y: taskLaneStartY - 64 },
    data: frameData({
      height: Math.max(visibleTaskGroups.length, 1) * taskLaneGap - 120,
      subtitle: `${taskGroups.length} task groups`,
      title: "Task groups[]",
      variant: "group",
      width: 4600,
    }),
  });

  visibleTaskGroups.forEach((group, index) => {
    addTaskGroupLane({
      activeRunIds,
      edges,
      extractedLookup,
      group,
      index,
      nodes,
      outputLookup,
      runLookup,
      y: taskLaneStartY + index * taskLaneGap,
      hiddenSiblingItems: index === 0 ? taskGroups.map((hiddenGroup) => ({
        id: hiddenGroup.id,
        selected: hiddenGroup.id === group.id,
        title: hiddenGroup.title,
      })) : undefined,
      progressItems: index === 0
        ? taskGroupProgressItems
        : undefined,
      taskGroupCount: taskGroups.length,
    });
  });

  if (visibleScriptResources.length > 0) {
    addFrame(nodes, {
      id: "script-groups-frame",
      position: { x: 1360, y: scriptLaneY - 64 },
      data: frameData({
        height: Math.max(visibleScriptResources.length, 1) * 420 - 16,
        subtitle: `${scriptResources.length} script resources`,
        title: "Script groups[]",
        variant: "group",
        width: 4600,
      }),
    });
    addScriptGroupCollection({
      edges,
      nodes,
      resourceCount: scriptResources.length,
      y: scriptLaneY,
    });
  }

  visibleScriptResources.forEach((resource, index) => {
    addScriptLane({
      activeRunIds,
      edges,
      index,
      nodes,
      resource,
      runLookup,
      extractedLookup,
      outputLookup,
      y: scriptLaneY + index * 420,
    });
  });

  addReviewLane({ edges, inventory: derivedInventory, nodes, runs, y: scriptLaneY + visibleScriptResources.length * 420 + 120 });
  hideExpandedWorkflow(nodes, edges);
  addFunctionSummaryLanes({
    edges,
    nodes,
    outputLookup,
    scriptProgressItems,
    scriptResources,
    selectedTaskGroup,
    taskGroupProgressItems,
    taskGroups,
    y: centerY - 120,
  });

  return { nodes, edges };
}

export function validateBlueprintGraph({
  edges,
  nodes,
}: {
  edges: Edge[];
  nodes: BlueprintGraphNode[];
}): BlueprintCompileIssue[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const issues: BlueprintCompileIssue[] = [];

  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target || source.type !== "blueprint" || target.type !== "blueprint") {
      continue;
    }

    const sourcePort = portForHandle(source.data.outputs, edge.sourceHandle, "out");
    const targetPort = portForHandle(target.data.inputs, edge.targetHandle, "in");
    if (!sourcePort || !targetPort) {
      issues.push({
        detail: `Edge "${edge.label ?? edge.id}" references a missing typed port.`,
        edgeId: edge.id,
        label: "Missing port contract",
        severity: "error",
        sourceId: edge.source,
        targetId: edge.target,
      });
      continue;
    }

    const cardinalityIssue = validatePortCardinality(sourcePort, targetPort);
    if (cardinalityIssue) {
      issues.push({
        detail: cardinalityIssue,
        edgeId: edge.id,
        label: "Invalid cardinality",
        severity: "error",
        sourceId: edge.source,
        targetId: edge.target,
      });
    }

    const typeIssue = validatePortType(sourcePort, targetPort);
    if (typeIssue) {
      issues.push({
        detail: typeIssue,
        edgeId: edge.id,
        label: "Invalid value type",
        severity: "error",
        sourceId: edge.source,
        targetId: edge.target,
      });
    }
  }

  return issues;
}

function addNode(nodes: BlueprintGraphNode[], node: BlueprintNodeInput) {
  nodes.push({ ...node, type: "blueprint" });
}

function addFrame(nodes: BlueprintGraphNode[], node: BlueprintFrameInput) {
  nodes.push({ ...node, selectable: false, type: "frame", zIndex: -1 });
}

function addFunctionSummaryLanes({
  edges,
  nodes,
  outputLookup,
  scriptProgressItems,
  scriptResources,
  selectedTaskGroup,
  taskGroupProgressItems,
  taskGroups,
  y,
}: {
  edges: Edge[];
  nodes: BlueprintGraphNode[];
  outputLookup: OutputLookup;
  scriptProgressItems: BlueprintProgressItem[];
  scriptResources: CourseInventoryNode[];
  selectedTaskGroup: CourseInventoryTaskGroup | null;
  taskGroupProgressItems: BlueprintProgressItem[];
  taskGroups: CourseInventoryTaskGroup[];
  y: number;
}) {
  if (taskGroups.length > 0) {
    addTaskOutputMapFunction({
      edges,
      nodes,
      outputLookup,
      progressItems: taskGroupProgressItems,
      selectedGroup: selectedTaskGroup ?? taskGroups[0]!,
      taskGroups,
      y,
    });
  }

  if (scriptResources.length > 0) {
    addScriptOutputMapFunction({
      edges,
      nodes,
      outputLookup,
      progressItems: scriptProgressItems,
      resources: scriptResources,
      y: y + 800,
    });
  }
}

function addTaskOutputMapFunction({
  edges,
  nodes,
  outputLookup,
  progressItems,
  selectedGroup,
  taskGroups,
  y,
}: {
  edges: Edge[];
  nodes: BlueprintGraphNode[];
  outputLookup: OutputLookup;
  progressItems: BlueprintProgressItem[];
  selectedGroup: CourseInventoryTaskGroup;
  taskGroups: CourseInventoryTaskGroup[];
  y: number;
}) {
  const summary = summarizeProgressItems(progressItems);
  const failed = (summary?.failed ?? 0) > 0;
  const selectedProgress = progressItems.find((item) => item.selected) ?? progressItems[0] ?? null;
  const selectedOutputs = taskOutputsForGroup(outputLookup, selectedGroup);
  const mapId = "map-build-task-output";
  const outputId = "task-outputs-collection";
  const runScope = taskGroupRunScope(selectedGroup);

  addNode(nodes, {
    id: mapId,
    position: { x: 1360, y },
    data: {
      title: "MAP BuildTaskOutput",
      subtitle: `TaskGroup[] -> TaskOutput[] · selected ${selectedGroup.title}`,
      detail: "Runs the BuildTaskOutput function for every task group. The function boundary makes the array loop explicit instead of hiding a for-loop inside a normal node.",
      evidence: [
        `Input collection: ${taskGroups.length} task groups`,
        `Selected magazine item: ${selectedGroup.title}`,
        "Internal function: INPUT -> split sheet/solution -> extract -> collect -> Codex -> OUTPUT",
      ],
      inputs: [{ cardinality: "array", label: "task groups[]", detail: `${taskGroups.length} task groups`, valueType: "TaskGroup" }],
      outputs: [{ cardinality: "array", label: "task outputs[]", detail: `${outputLookup.totalTasks} website tasks`, valueType: "TaskOutput" }],
      progressItems,
      hiddenItems: taskGroups.map((group) => ({
        id: group.id,
        selected: group.id === selectedGroup.id,
        title: group.title,
      })),
      bodyData: {
        type: "map_function",
        name: "BuildTaskOutput",
        contract: {
          inputNode: {
            title: "INPUT",
            outputs: [{ label: "task group", valueType: "TaskGroup", cardinality: "single" }],
          },
          body: [
            "Split task group into sheet pdf and solution pdf",
            "Extract pages and semantic sections",
            "Collect sheet and solution extraction into one input bundle",
            "Codex curates one website task draft",
          ],
          outputNode: {
            title: "OUTPUT",
            inputs: [{ label: "task output", valueType: "TaskOutput", cardinality: "single" }],
          },
        },
        selectedItem: {
          id: selectedGroup.id,
          title: selectedGroup.title,
          sheet: selectedGroup.sheet.name,
          solution: selectedGroup.solution?.name ?? null,
          status: selectedProgress?.status ?? "pending",
          detail: selectedProgress?.detail ?? null,
          outputs: selectedOutputs.map((output) => ({
            id: output.taskId,
            title: output.title,
            status: output.status,
          })),
        },
        progress: summary,
      },
      outputPreview: [
        "function BuildTaskOutput(input: TaskGroup) -> TaskOutput",
        "",
        "INPUT",
        "  out task group",
        "",
        "BODY",
        "  split sheet + solution",
        "  extract pages + sections",
        "  collect extraction pair",
        "  codex curate task",
        "",
        "OUTPUT",
        "  in task output",
        "",
        `Selected: ${selectedGroup.title}`,
        `done: ${summary?.done ?? 0} · failed: ${summary?.failed ?? 0} · pending: ${summary?.pending ?? 0}`,
      ].join("\n"),
      problems: failed
        ? [{
            label: "Some task outputs failed",
            detail: `${summary?.failed ?? 0} task group${summary?.failed === 1 ? "" : "s"} need review before the whole map can be trusted.`,
            severity: "error",
          }]
        : undefined,
      runScope,
      stepKind: "split",
      tone: failed ? "warning" : "process",
      status: failed ? "needs_review" : "mapped",
      meta: [
        { label: "Function", value: "BuildTaskOutput" },
        { label: "Input", value: `${taskGroups.length} TaskGroup items` },
        { label: "Output", value: `${outputLookup.totalTasks} TaskOutput items` },
        { label: "Selected", value: selectedGroup.title },
      ],
    },
  });
  addEdge(edges, "resource-set", mapId, "map", { sourceHandle: "out-0", targetHandle: "in-2" });

  addNode(nodes, {
    id: outputId,
    position: { x: 2040, y },
    data: {
      title: "Task Outputs[]",
      subtitle: `${outputLookup.totalTasks} website task${outputLookup.totalTasks === 1 ? "" : "s"}`,
      detail: "Output boundary for all task results produced by BuildTaskOutput. It only accepts the array emitted by the map function.",
      evidence: [
        `Received ${outputLookup.totalTasks} task output(s)`,
        `Source function: ${mapId}`,
      ],
      inputs: [{ cardinality: "array", label: "task outputs[]", detail: `${outputLookup.totalTasks} website tasks`, valueType: "TaskOutput" }],
      outputs: [{ cardinality: "array", label: "website tasks[]", detail: `${outputLookup.totalTasks} published tasks`, valueType: "WebsiteTask" }],
      bodyData: {
        type: "function_output_collection",
        sourceFunction: "BuildTaskOutput",
        totalTasks: outputLookup.totalTasks,
        selectedGroup: selectedGroup.title,
        selectedOutputs: selectedOutputs.map((output) => ({
          id: output.taskId,
          title: output.title,
          promptMarkdown: output.promptMarkdown,
        })),
      },
      outputPreview: selectedOutputs.length > 0
        ? selectedOutputs.map((output) => `${output.title}\n${output.promptMarkdown}`).join("\n\n")
        : `No website task output is loaded for ${selectedGroup.title}.`,
      renderedFields: selectedOutputs.map((output, index) => ({
        label: output.title,
        path: `selectedOutputs[${index}].promptMarkdown`,
        type: "markdown",
        value: output.promptMarkdown,
      })),
      problems: failed
        ? [{
            label: "Upstream map has failed items",
            detail: "The output collection is partial until the failed task group items are fixed.",
            severity: "warning",
          }]
        : undefined,
      runScope,
      stepKind: "collect",
      tone: failed ? "warning" : "output",
      status: failed ? "partial" : "ready",
      meta: [
        { label: "Items", value: String(outputLookup.totalTasks) },
        { label: "Selected group", value: selectedGroup.title },
      ],
    },
  });
  addEdge(edges, mapId, outputId, "publish", { edgeType: "straight", sourceHandle: "out-2", targetHandle: "in-2" });
}

function addScriptOutputMapFunction({
  edges,
  nodes,
  outputLookup,
  progressItems,
  resources,
  y,
}: {
  edges: Edge[];
  nodes: BlueprintGraphNode[];
  outputLookup: OutputLookup;
  progressItems: BlueprintProgressItem[];
  resources: CourseInventoryNode[];
  y: number;
}) {
  const summary = summarizeProgressItems(progressItems);
  const failed = (summary?.failed ?? 0) > 0;
  const selectedResource = resources[0]!;
  const selectedOutputs = scriptOutputsForResource(outputLookup, selectedResource);
  const mapId = "map-build-script-section";
  const outputId = "script-outputs-collection";
  const runScope = resourceRunScope(selectedResource);

  addNode(nodes, {
    id: mapId,
    position: { x: 1360, y },
    data: {
      title: "MAP BuildScriptSection",
      subtitle: `ScriptGroup[] -> ScriptSection[] · ${resources.length} items`,
      detail: "Runs the script-section function for every script resource. The loop boundary is explicit and produces one script section array.",
      evidence: [
        `Input collection: ${resources.length} script groups`,
        "Internal function: INPUT -> PDF -> pages -> sections -> extraction -> Codex -> OUTPUT",
      ],
      inputs: [{ cardinality: "array", label: "script groups[]", detail: `${resources.length} script groups`, valueType: "ScriptGroup" }],
      outputs: [{ cardinality: "array", label: "script sections[]", detail: `${outputLookup.totalScriptSections} sections`, valueType: "ScriptSection" }],
      progressItems,
      bodyData: {
        type: "map_function",
        name: "BuildScriptSection",
        contract: {
          inputNode: {
            title: "INPUT",
            outputs: [{ label: "script group", valueType: "ScriptGroup", cardinality: "single" }],
          },
          body: [
            "Extract script PDF into pages and sections",
            "Select active extraction",
            "Codex curates one website script section",
          ],
          outputNode: {
            title: "OUTPUT",
            inputs: [{ label: "script section", valueType: "ScriptSection", cardinality: "single" }],
          },
        },
        progress: summary,
      },
      outputPreview: [
        "function BuildScriptSection(input: ScriptGroup) -> ScriptSection",
        "",
        "INPUT",
        "  out script group",
        "",
        "BODY",
        "  extract pages + sections",
        "  select active extraction",
        "  codex curate section",
        "",
        "OUTPUT",
        "  in script section",
        "",
        `done: ${summary?.done ?? 0} · failed: ${summary?.failed ?? 0} · pending: ${summary?.pending ?? 0}`,
      ].join("\n"),
      problems: failed
        ? [{
            label: "Some script sections failed",
            detail: `${summary?.failed ?? 0} script item${summary?.failed === 1 ? "" : "s"} need review.`,
            severity: "error",
          }]
        : undefined,
      runScope,
      stepKind: "split",
      tone: failed ? "warning" : "process",
      status: failed ? "needs_review" : "mapped",
      meta: [
        { label: "Function", value: "BuildScriptSection" },
        { label: "Input", value: `${resources.length} ScriptGroup items` },
        { label: "Output", value: `${outputLookup.totalScriptSections} ScriptSection items` },
      ],
    },
  });
  addEdge(edges, "resource-set", mapId, "map", { sourceHandle: "out-2", targetHandle: "in-2" });

  addNode(nodes, {
    id: outputId,
    position: { x: 2040, y },
    data: {
      title: "Script Sections[]",
      subtitle: `${outputLookup.totalScriptSections} website section${outputLookup.totalScriptSections === 1 ? "" : "s"}`,
      detail: "Output boundary for all script sections produced by BuildScriptSection.",
      evidence: [`Received ${outputLookup.totalScriptSections} script section output(s)`],
      inputs: [{ cardinality: "array", label: "script sections[]", detail: `${outputLookup.totalScriptSections} sections`, valueType: "ScriptSection" }],
      outputs: [{ cardinality: "array", label: "website script[]", detail: `${outputLookup.totalScriptSections} sections`, valueType: "WebsiteScriptSection" }],
      bodyData: {
        type: "function_output_collection",
        sourceFunction: "BuildScriptSection",
        totalSections: outputLookup.totalScriptSections,
        selectedOutputs: selectedOutputs.map((output) => ({
          id: output.id,
          title: output.title,
          status: output.statusLabel,
        })),
      },
      outputPreview: selectedOutputs.length > 0
        ? selectedOutputs.map((output) => `${output.title}\n${output.statusLabel}`).join("\n\n")
        : "No script output is loaded for the selected script resource.",
      runScope,
      stepKind: "collect",
      tone: failed ? "warning" : "output",
      status: failed ? "partial" : "ready",
      meta: [{ label: "Items", value: String(outputLookup.totalScriptSections) }],
    },
  });
  addEdge(edges, mapId, outputId, "publish", { edgeType: "straight", sourceHandle: "out-2", targetHandle: "in-2" });
}

function hideExpandedWorkflow(nodes: BlueprintGraphNode[], edges: Edge[]) {
  const hiddenNodeIds = new Set<string>();
  for (const node of nodes) {
    if (isExpandedWorkflowNode(node.id)) {
      node.hidden = true;
      hiddenNodeIds.add(node.id);
    }
  }
  for (const edge of edges) {
    if (hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target)) {
      edge.hidden = true;
    }
  }
}

function isExpandedWorkflowNode(id: string): boolean {
  return id === "task-groups-frame"
    || id === "script-groups-frame"
    || id === "task-groups-collection"
    || id === "task-groups-iterator"
    || id === "script-groups-collection"
    || id.startsWith("task-group-")
    || id.startsWith("script-");
}

function addEdge(
  edges: Edge[],
  source: string,
  target: string,
  label: string,
  options?: { edgeType?: Edge["type"]; muted?: boolean; sourceHandle?: string; targetHandle?: string },
) {
  const color = options?.muted ? "#a3a3a3" : label === "failed" ? "#dc2626" : "#525252";
  edges.push({
    id: `${source}->${target}`,
    labelBgPadding: [8, 4],
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
    labelStyle: { fill: options?.muted ? "#737373" : "#404040", fontSize: 11, fontWeight: 600 },
    markerEnd: { color, type: MarkerType.ArrowClosed },
    source,
    sourceHandle: options?.sourceHandle,
    style: {
      stroke: color,
      strokeDasharray: options?.muted ? "4 6" : undefined,
      strokeWidth: options?.muted ? 1.5 : 2.25,
    },
    target,
    targetHandle: options?.targetHandle,
    type: options?.edgeType ?? "smoothstep",
  });
}

function resourceSetBodyData({
  inventory,
  source,
  unavailableReason,
  warnings,
}: {
  inventory: CourseInventoryResponse | null;
  source: "inventory" | "missing" | "pipeline_status_fallback";
  unavailableReason?: string;
  warnings: Array<BlueprintNodeData & { sourceId: string }>;
}) {
  if (!inventory) {
    return {
      source,
      unavailableReason: unavailableReason ?? "No inventory response loaded.",
      taskGroups: [],
      lectureMaterial: [],
      reviewItems: [],
      unknown: [],
    };
  }

  return {
    source,
    courseId: inventory.courseId,
    generatedAt: inventory.generatedAt,
    artifactRoot: inventory.artifactRoot ?? null,
    summary: inventory.summary,
    taskGroups: sortTaskGroups(inventory.taskGroups).map(taskGroupBodyData),
    lectureMaterial: sortInventoryNodes(inventory.lectureMaterial).map(resourceBodyData),
    references: sortInventoryNodes(inventory.references).map(resourceBodyData),
    interactions: sortInventoryNodes(inventory.interactions).map(resourceBodyData),
    ignoredAllowed: sortInventoryNodes(inventory.ignoredAllowed ?? []).map(resourceBodyData),
    unknown: sortInventoryNodes(inventory.unknown).map(resourceBodyData),
    reviewItems: warnings.map((warning) => ({
      title: warning.title,
      status: warning.status ?? null,
      detail: warning.detail,
      sourceId: warning.sourceId,
    })),
  };
}

function taskGroupBodyData(group: CourseInventoryResponse["taskGroups"][number]) {
  return {
    id: group.id,
    title: group.title,
    pairingStatus: group.pairingStatus,
    pairingConfidence: group.pairingConfidence,
    pairingReason: group.pairingReason,
    sheet: resourceBodyData(group.sheet),
    solution: group.solution ? resourceBodyData(group.solution) : null,
    solutionCandidates: group.solutionCandidates?.map(resourceBodyData) ?? [],
  };
}

function resourceBodyData(resource: CourseInventoryNode) {
  return {
    id: resource.id,
    name: resource.name,
    type: resource.type,
    resourceType: resource.resourceType ?? null,
    fileType: resource.fileType ?? null,
    sectionId: resource.sectionId ?? null,
    sectionName: resource.sectionName ?? null,
    bucket: resource.bucket,
    role: resource.role,
    confidence: resource.confidence,
    reason: resource.reason,
    url: redactSensitiveUrl(resource.url ?? null),
  };
}

function redactSensitiveUrl(value: string | null): string | null {
  if (!value) return value;
  try {
    const url = new URL(value);
    for (const param of ["token", "wstoken", "sesskey", "password", "key"]) {
      if (url.searchParams.has(param)) url.searchParams.set(param, "[redacted]");
    }
    return url.toString();
  } catch {
    return value.replace(/([?&](?:token|wstoken|sesskey|password|key)=)[^&\s]+/gi, "$1[redacted]");
  }
}

function inventoryFromStatus(status: StudyPipelineStatusResponse | null): CourseInventoryResponse | null {
  if (!status) return null;

  const nodes = status.materials.map(materialToInventoryNode);
  const taskNodes = nodes.filter((node) => node.role === "sheet");
  const solutionNodes = nodes.filter((node) => node.role === "solution");
  const lectureMaterial = nodes.filter((node) => node.bucket === "lecture_material");
  const unknown = nodes.filter((node) => node.bucket === "unknown");
  const solutionsByKey = new Map(solutionNodes.map((node) => [pairingKey(node.name), node] as const));
  const taskGroups = taskNodes.map((sheet) => {
    const solution = solutionsByKey.get(pairingKey(sheet.name));
    return {
      id: `derived:${sheet.id}`,
      pairingConfidence: solution ? "medium" : "low",
      pairingReason: solution
        ? "Derived from pipeline status material names because inventory was unavailable."
        : "No matching solution material was visible in pipeline status.",
      pairingStatus: solution ? "paired" as const : "missing_solution" as const,
      sheet,
      solution,
      title: sheet.name,
    };
  });

  return {
    artifactRoot: undefined,
    courseId: status.courseId,
    generatedAt: status.createdAt,
    interactions: [],
    lectureMaterial,
    references: [],
    summary: {
      ambiguousTaskGroups: 0,
      ignoredAllowed: 0,
      interactions: 0,
      lectureMaterial: lectureMaterial.length,
      missingSolutionGroups: taskGroups.filter((group) => !group.solution).length,
      pairedTaskGroups: taskGroups.filter((group) => Boolean(group.solution)).length,
      references: 0,
      taskGroups: taskGroups.length,
      totalResources: status.summary.totalResources,
      unknown: unknown.length,
    },
    taskGroups,
    unknown,
  };
}

function materialToInventoryNode(material: StudyPipelineStatusResponse["materials"][number]): CourseInventoryNode {
  const text = normalizedText(`${material.name} ${material.type} ${material.resourceType ?? ""} ${material.fileType ?? ""}`);
  const solution = text.includes("solution") || text.includes("losung");
  const task = !solution && (text.includes("task") || text.includes("aufgabenblatt"));
  const lecture = text.includes("slide") || text.includes("script") || /^teil\s+\d+/.test(text);
  const bucket = task ? "task_sheet" : solution ? "solution" : lecture ? "lecture_material" : "unknown";
  const role = task ? "sheet" : solution ? "solution" : lecture ? "script" : "unknown";

  return {
    bucket,
    confidence: bucket === "unknown" ? "low" : "medium",
    fileType: material.fileType,
    id: material.id,
    name: material.name,
    reason: "Derived from pipeline status because inventory was unavailable.",
    resourceType: material.resourceType,
    role,
    sectionId: material.sectionId,
    sectionName: material.sectionName,
    type: material.type,
  };
}

function pairingKey(name: string): string {
  return normalizedText(name)
    .replace(/\b(solution|losung)\b/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildExtractedLookup(extractedDocuments: ExtractedDocumentsResponse | null): ExtractedLookup {
  const byResourceId = new Map<string, ExtractedDocumentsResponse["documents"][number]>();
  for (const document of extractedDocuments?.documents ?? []) {
    for (const key of resourceKeys(document.resource.id)) {
      byResourceId.set(key, document);
    }
  }
  return { byResourceId, response: extractedDocuments };
}

function buildOutputLookup(taskView: TaskViewResponse | null): OutputLookup {
  const byResourceId = new Map<string, TaskOutputRecord[]>();
  const scriptSectionsByResourceId = new Map<string, ScriptOutputRecord[]>();
  for (const sheet of taskView?.sheets ?? []) {
    for (const task of sheet.tasks) {
      const output = {
        ...task,
        sheetTitle: sheet.title,
        solutionMarkdown: sheet.solutionMarkdown,
        solutionResourceId: sheet.solutionResourceId,
        solutionTitle: sheet.solutionTitle,
      };
      for (const key of resourceKeys(task.sourceResourceId || sheet.resourceId)) {
        byResourceId.set(key, [...(byResourceId.get(key) ?? []), output]);
      }
      for (const key of resourceKeys(sheet.resourceId)) {
        byResourceId.set(key, [...(byResourceId.get(key) ?? []), output]);
      }
    }
  }
  for (const section of taskView?.scriptSections ?? []) {
    if (!section.sourcePath) continue;
    for (const resource of taskView?.resources ?? []) {
      if (!section.sourcePath.includes(resource.resourceId) && !section.sourcePath.includes(resource.title)) continue;
      for (const key of resourceKeys(resource.resourceId)) {
        scriptSectionsByResourceId.set(key, [...(scriptSectionsByResourceId.get(key) ?? []), section]);
      }
    }
  }
  const totalTasks = (taskView?.sheets ?? []).reduce((sum, sheet) => sum + sheet.tasks.length, 0);
  const totalScriptSections = taskView?.scriptSections?.length ?? 0;
  return {
    byResourceId,
    scriptSectionsByResourceId,
    taskView,
    totalOutputs: totalTasks + totalScriptSections,
    totalScriptSections,
    totalTasks,
  };
}

function buildScriptProgressItems({
  outputLookup,
  resources,
  runLookup,
}: {
  outputLookup: OutputLookup;
  resources: CourseInventoryNode[];
  runLookup: ReturnType<typeof buildRunLookup>;
}): BlueprintProgressItem[] {
  return resources.map((resource) => {
    const outputs = scriptOutputsForResource(outputLookup, resource);
    const failedRun = findLatestResourceRun(runLookup, resource.id, ["curated", "codex_curate", "extracted", "extract_text", "extract_pages"]);
    const status = failedRun?.status === "failed"
      ? "failed"
      : failedRun?.status === "running" || failedRun?.status === "queued"
        ? "loading"
        : outputs.length > 0
          ? "done"
          : "pending";
    return {
      detail: failedRun?.error
        ?? (outputs.length > 0
          ? `${outputs.length} website script section${outputs.length === 1 ? "" : "s"}`
          : resource.reason ?? resource.bucket),
      id: resource.id,
      selected: resource.id === resources[0]?.id,
      status,
      title: resource.name,
    };
  });
}

function taskOutputsForGroup(outputLookup: OutputLookup, group: CourseInventoryTaskGroup): TaskOutputRecord[] {
  const seen = new Set<string>();
  const outputs: TaskOutputRecord[] = [];
  for (const key of resourceKeys(group.sheet.id)) {
    for (const output of outputLookup.byResourceId.get(key) ?? []) {
      if (seen.has(output.taskId)) continue;
      seen.add(output.taskId);
      outputs.push(output);
    }
  }
  return outputs;
}

function scriptOutputsForResource(outputLookup: OutputLookup, resource: CourseInventoryNode): ScriptOutputRecord[] {
  const seen = new Set<string>();
  const outputs: ScriptOutputRecord[] = [];
  for (const key of resourceKeys(resource.id)) {
    for (const output of outputLookup.scriptSectionsByResourceId.get(key) ?? []) {
      if (seen.has(output.id)) continue;
      seen.add(output.id);
      outputs.push(output);
    }
  }
  return outputs;
}

function findLatestResourceRun(
  runLookup: ReturnType<typeof buildRunLookup>,
  resourceId: string,
  stages: string[],
): PipelineRunRecord | null {
  for (const stage of stages) {
    for (const key of resourceKeys(resourceId)) {
      const runKey = `${key}:${stage}`;
      const activeRun = runLookup.activeByResourceStage.get(runKey);
      const latestRun = runLookup.byResourceStage.get(runKey)?.[0] ?? null;
      if (activeRun) return activeRun;
      if (latestRun) return latestRun;
    }
  }
  return null;
}

function taskGroupRunScope(group: CourseInventoryTaskGroup): BlueprintRunScope {
  return {
    kind: "task_group",
    label: group.title,
    resourceIds: [group.sheet.id, group.solution?.id].filter(Boolean) as string[],
  };
}

function resourceRunScope(resource: CourseInventoryNode): BlueprintRunScope {
  return {
    kind: "resource",
    label: resource.name,
    resourceIds: [resource.id],
  };
}

function summarizeProgressItems(progressItems?: BlueprintProgressItem[]) {
  if (!progressItems?.length) return null;
  return progressItems.reduce(
    (summary, item) => {
      if (item.status === "done") summary.done += 1;
      else if (item.status === "failed") summary.failed += 1;
      else summary.pending += 1;
      return summary;
    },
    { done: 0, failed: 0, pending: 0 },
  );
}

function buildRootProblems({
  extractedDocuments,
  runs,
  taskView,
  unavailable,
}: {
  extractedDocuments: ExtractedDocumentsResponse | null;
  runs: PipelineRunsResponse | null;
  taskView: TaskViewResponse | null;
  unavailable?: CoursePipelineBlueprintModelInput["unavailable"];
}): BlueprintProblem[] | undefined {
  const problems: BlueprintProblem[] = [];
  if (!runs) {
    problems.push({
      detail: unavailable?.runs ?? "Run history is not available, so active extraction choices cannot be compared.",
      label: "Run history missing",
      severity: "warning",
    });
  }
  if (!extractedDocuments) {
    problems.push({
      detail: unavailable?.extractedDocuments ?? "Extracted document structure is not available for inspection.",
      label: "Extraction output missing",
      severity: "warning",
    });
  }
  if (!taskView) {
    problems.push({
      detail: unavailable?.taskView ?? "Final task and script outputs are not available for website preview.",
      label: "Website output missing",
      severity: "warning",
    });
  }
  return problems.length > 0 ? problems : undefined;
}

const PORT_SLOTS_BY_COUNT: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 2, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function portForHandle(
  ports: BlueprintPort[],
  handle: string | null | undefined,
  direction: "in" | "out",
): BlueprintPort | null {
  if (ports.length === 0) return null;
  if (!handle) return ports.length === 1 ? ports[0]! : null;

  const match = handle.match(new RegExp(`^${direction}-(\\d+)$`));
  if (!match) return null;

  const slot = Number(match[1]);
  const slots = PORT_SLOTS_BY_COUNT[Math.min(6, Math.max(1, ports.length))] ?? PORT_SLOTS_BY_COUNT[1]!;
  const index = slots.indexOf(slot);
  return index >= 0 ? ports[index] ?? null : null;
}

function validatePortCardinality(source: BlueprintPort, target: BlueprintPort): string | null {
  const sourceCardinality = portCardinality(source);
  const targetCardinality = portCardinality(target);
  if (sourceCardinality === targetCardinality) return null;
  if (sourceCardinality === "single" && targetCardinality === "optional") return null;
  return `Cannot connect ${source.label} (${sourceCardinality}) to ${target.label} (${targetCardinality}). Use an explicit map, collect, or guard boundary.`;
}

function validatePortType(source: BlueprintPort, target: BlueprintPort): string | null {
  if (!source.valueType || !target.valueType || source.valueType === target.valueType) {
    return null;
  }
  return `Cannot connect ${source.label} (${source.valueType}) to ${target.label} (${target.valueType}).`;
}

function portCardinality(port: BlueprintPort): NonNullable<BlueprintPort["cardinality"]> {
  if (port.cardinality) return port.cardinality;
  if (/\[\]/.test(port.label)) return "array";
  if (/\?|optional/i.test(`${port.label} ${port.detail ?? ""}`)) return "optional";
  return "single";
}

export function resourceKeys(resourceId: string | undefined): string[] {
  if (!resourceId) return [];
  const trimmed = resourceId.trim();
  const numeric = trimmed.match(/(\d+)(?!.*\d)/)?.[1];
  return [...new Set([
    trimmed,
    trimmed.replace(/^resource:moodle:/, ""),
    numeric ?? "",
    numeric ? `resource:moodle:${numeric}` : "",
  ].filter(Boolean))];
}

function sortTaskGroups(groups: CourseInventoryResponse["taskGroups"]): CourseInventoryResponse["taskGroups"] {
  return [...groups].sort((a, b) => naturalCompare(a.title, b.title));
}

function sortInventoryNodes(nodes: CourseInventoryNode[]): CourseInventoryNode[] {
  return [...nodes].sort((a, b) => naturalCompare(a.name, b.name));
}

function visibleTaskGroupItems(
  items: CourseInventoryResponse["taskGroups"],
  selectedIds: string[],
): CourseInventoryResponse["taskGroups"] {
  if (items.length === 0) return [];
  const selected = items.find((item) => selectedIds.includes(item.id));
  return [selected ?? items[0]!];
}

function naturalCompare(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function frameData({
  height,
  subtitle,
  title,
  variant = "group",
  width,
}: {
  height: number;
  subtitle: string;
  title: string;
  variant?: "group" | "stage";
  width: number;
}): BlueprintNodeData {
  return {
    detail: "Visual group for repeated pipeline items.",
    frame: { height, variant, width },
    inputs: [],
    meta: [],
    outputs: [],
    stepKind: "split",
    subtitle,
    title,
    tone: "process",
  };
}
