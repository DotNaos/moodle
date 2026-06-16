"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  Eye,
  FileText,
  GitCompareArrows,
  GitBranch,
  ImageOff,
  Layers,
  LoaderCircle,
  Maximize2,
  Play,
  RotateCw,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Spinner } from "@/components/ui/spinner";
import {
  buildBlueprintGraph,
  validateBlueprintGraph,
  type BlueprintExtractionVariant,
  type BlueprintFunctionKind,
  type BlueprintCodexConfig,
  type BlueprintGraphNode,
  type BlueprintNode,
  type BlueprintRunScope,
  type BlueprintRunRequest,
  type BlueprintRunStage,
  type BlueprintNodeTone,
  type BlueprintPort,
  type BlueprintRenderedField,
  type PipelineRunRecord,
  type PipelineRunsResponse,
} from "@/components/course-pipeline-blueprint-model";
import type { ExtractedDocumentsResponse } from "@/components/extracted-document-inspector";
import type {
  CourseInventoryResponse,
  StudyPipelineStatusResponse,
} from "@/components/study-pipeline-preview";
import type { TaskViewResponse } from "@/components/task-study-panel";
import { cn } from "@/lib/utils";
import {
  LiveStatePanel,
  NodeLiveIndicator,
  liveNodeClass,
} from "@/components/course-pipeline-live-ui";
import { buildUpstreamTrace, type BlueprintTraceStep } from "@/components/course-pipeline-trace";
import { SourceTracePanel } from "@/components/course-pipeline-trace-panel";
import { LossTracePanel } from "@/components/course-pipeline-loss-panel";
import { PipelineCableEdge } from "@/components/course-pipeline-blueprint-edge";
import {
  buildPipelineNodePreview,
  type PipelineNodePreview,
} from "@/components/course-pipeline-node-preview";

export { buildBlueprintGraph, validateBlueprintGraph };
export type { PipelineRunRecord, PipelineRunsResponse };

type CoursePipelineBlueprintProps = {
  codexConfig?: BlueprintCodexConfig;
  extractedDocuments: ExtractedDocumentsResponse | null;
  inventory: CourseInventoryResponse | null;
  runs: PipelineRunsResponse | null;
  status: StudyPipelineStatusResponse | null;
  taskView: TaskViewResponse | null;
  onRerunExtraction?: (engine: string) => void;
  onRunNode?: (request: BlueprintRunRequest) => void;
  onSelectedScopeChange?: (scope: BlueprintRunScope | null) => void;
  onSelectRun?: (runId: string) => void;
  rerunningEngine?: string | null;
  runningNodeAction?: boolean;
  selectingRunId?: string | null;
  unavailable?: {
    extractedDocuments?: string;
    inventory?: string;
    runs?: string;
    taskView?: string;
  };
};

const nodeTypes = {
  blueprint: BlueprintNodeCard,
  frame: BlueprintGroupFrame,
};

const edgeTypes = {
  pipeline: PipelineCableEdge,
};

export function CoursePipelineBlueprint({
  codexConfig,
  extractedDocuments,
  inventory,
  runs,
  status,
  taskView,
  onRerunExtraction,
  onRunNode,
  onSelectedScopeChange,
  onSelectRun,
  rerunningEngine,
  runningNodeAction,
  selectingRunId,
  unavailable,
}: CoursePipelineBlueprintProps) {
  const [edgeStyle, setEdgeStyle] = useState<"rounded" | "square">("rounded");
  const [functionView, setFunctionView] = useState<BlueprintFunctionKind | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTaskGroupIds, setSelectedTaskGroupIds] = useState<string[]>([]);
  const graph = useMemo(
    () => buildBlueprintGraph({ extractedDocuments, inventory, runs, selectedTaskGroupIds, status, taskView, unavailable }),
    [extractedDocuments, inventory, runs, selectedTaskGroupIds, status, taskView, unavailable],
  );
  const compileIssues = useMemo(() => validateBlueprintGraph(graph), [graph]);
  const rawNodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const visibleEdges = useMemo(
    () => graph.edges.map((edge) => {
      const stroke = edgeColor(edge, rawNodeById);
      return {
        ...edge,
        label: undefined,
        markerEnd: undefined,
        style: {
          ...edge.style,
          stroke,
          strokeLinecap: "round" as const,
          strokeWidth: edge.style?.strokeWidth ?? 2.5,
        },
        data: { ...edge.data, renderStyle: edgeStyle },
        type: "pipeline",
      };
    }),
    [edgeStyle, graph.edges, rawNodeById],
  );
  const interactiveNodes = useMemo(
    () => graph.nodes.map((node) => ({
      ...node,
      data: node.type === "blueprint"
        ? {
            ...node.data,
            codexConfig: isCodexNodeData(node.data) ? codexConfig : undefined,
            onOpenFunction: setFunctionView,
            onRunFromNode: onRunNode,
            onSelect: setSelectedNodeId,
            onToggleHiddenItem: (itemId: string) => {
              setSelectedTaskGroupIds([itemId]);
            },
            runActionDisabled: Boolean(runningNodeAction),
            runActionRunning: Boolean(runningNodeAction),
          }
        : node.data,
      selected: node.id === selectedNodeId,
    })),
    [codexConfig, graph.nodes, onRunNode, runningNodeAction, selectedNodeId],
  );
  const displayGraph = useMemo(
    () => buildDisplayGraph({ edges: visibleEdges, functionView, nodes: interactiveNodes }),
    [functionView, interactiveNodes, visibleEdges],
  );
  const selectableNodes = useMemo<BlueprintNode[]>(
    () => displayGraph.nodes.filter((node): node is BlueprintNode => isBlueprintNode(node)),
    [displayGraph.nodes],
  );
  const selectedNode = selectableNodes.find((node) => node.id === selectedNodeId) ?? selectableNodes[0];
  const selectedTrace = useMemo(
    () => buildUpstreamTrace({ edges: displayGraph.edges, nodes: displayGraph.nodes, selectedNodeId: selectedNode?.id }),
    [displayGraph.edges, displayGraph.nodes, selectedNode?.id],
  );
  const selectedRunScope = selectedNode?.data.runScope ?? null;
  const selectedRunScopeKey = selectedRunScope
    ? `${selectedRunScope.kind}:${selectedRunScope.label}:${selectedRunScope.resourceIds.join(",")}`
    : "none";
  useEffect(() => {
    onSelectedScopeChange?.(selectedRunScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectedScopeChange, selectedRunScopeKey]);
  useEffect(() => {
    if (!selectableNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(selectableNodes[0]?.id ?? null);
    }
  }, [selectableNodes, selectedNodeId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative h-[calc(100dvh-10.5rem)] min-h-[560px] overflow-hidden rounded-3xl bg-secondary/45">
        {functionView ? (
          <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-background/95 px-2 py-2 shadow-sm shadow-black/10">
            <Button
              className="h-8 rounded-full px-3 text-xs font-semibold"
              onClick={() => setFunctionView(null)}
              type="button"
              variant="secondary"
            >
              Zurück
            </Button>
            <span className="truncate px-2 text-xs font-semibold text-muted-foreground">
              {functionViewLabel(functionView)}
            </span>
          </div>
        ) : null}
        {!functionView ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 rounded-full bg-background/90 px-3 py-2 shadow-sm shadow-black/10">
            <LegendPill kind="transform" label="1 -> 1 Transform" />
            <LegendPill kind="split" label="1 -> N Split" />
            <LegendPill kind="collect" label="N -> 1 Collect" />
          </div>
        ) : null}
        <div className="absolute right-4 top-4 z-10 flex rounded-full bg-background/90 p-1 shadow-sm shadow-black/10">
          <EdgeStyleButton active={edgeStyle === "rounded"} label="Rund" onClick={() => setEdgeStyle("rounded")} />
          <EdgeStyleButton active={edgeStyle === "square"} label="Eckig" onClick={() => setEdgeStyle("square")} />
        </div>
        {compileIssues.length > 0 ? (
          <div className="absolute inset-x-4 top-20 z-10 rounded-3xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow-sm shadow-destructive/10">
            Workflow contract invalid: {compileIssues[0]?.detail}
          </div>
        ) : null}
        <ReactFlow
          className="pipeline-blueprint-flow"
          colorMode="light"
          defaultViewport={functionView ? { x: 32, y: 12, zoom: 0.82 } : { x: -360, y: -700, zoom: 1 }}
          edges={displayGraph.edges}
          edgeTypes={edgeTypes}
          key={functionView ?? "overview"}
          maxZoom={1.4}
          minZoom={0.2}
          nodeTypes={nodeTypes}
          nodes={displayGraph.nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          onNodeClick={(event, node) => {
            const target = event.target instanceof HTMLElement ? event.target : null;
            const functionSlot = target?.closest<HTMLElement>("[data-function-kind]");
            const nextFunctionView = functionSlot?.dataset.functionKind;
            if (nextFunctionView === "task-output-map" || nextFunctionView === "script-output-map") {
              setFunctionView(nextFunctionView);
              return;
            }
            setSelectedNodeId(node.id);
          }}
          panOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background className="pointer-events-none" color="#d4d4d4" gap={22} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <aside className="min-h-[560px] rounded-3xl bg-secondary/45 px-4 py-4 lg:h-[calc(100dvh-10.5rem)] lg:overflow-auto">
        {selectedNode ? (
          <NodeInspector
            node={selectedNode}
            onRerunExtraction={onRerunExtraction}
            onSelectRun={onSelectRun}
            onSelectTraceNode={setSelectedNodeId}
            rerunningEngine={rerunningEngine}
            selectingRunId={selectingRunId}
            trace={selectedTrace}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Select a node to inspect its pipeline evidence.</p>
        )}
      </aside>
    </div>
  );
}

export function buildDisplayGraph({
  edges,
  functionView,
  nodes,
}: {
  edges: Edge[];
  functionView: BlueprintFunctionKind | null;
  nodes: BlueprintGraphNode[];
}): { edges: Edge[]; nodes: BlueprintGraphNode[] } {
  if (!functionView) {
    return { edges, nodes };
  }

  const boundary = functionBoundaryFor(functionView);
  const hiddenFunctionNodeIds = new Set(boundary.hiddenFunctionNodeIds);
  const innerNodes = nodes
    .filter((node): node is BlueprintNode => isBlueprintNode(node) && Boolean(node.hidden) && isFunctionInternalNode(functionView, node.id))
    .filter((node) => !isHiddenFunctionNode(functionView, hiddenFunctionNodeIds, node.id))
    .map((node) => ({ ...node, hidden: false }));
  const firstBodyNodeId = firstFunctionBodyNodeId(boundary, innerNodes);
  const boundaryNodes = buildFunctionBoundaryNodes(boundary, innerNodes, firstBodyNodeId);
  const graphNodes = [...boundaryNodes, ...innerNodes];
  const innerIds = new Set(graphNodes.map((node) => node.id));
  const normalizedNodes = normalizeFunctionNodePositions(graphNodes);
  const innerEdges = edges
    .filter((edge) => innerIds.has(edge.source) && innerIds.has(edge.target))
    .filter((edge) => !isHiddenFunctionNode(functionView, hiddenFunctionNodeIds, edge.source) && !isHiddenFunctionNode(functionView, hiddenFunctionNodeIds, edge.target))
    .map((edge) => ({ ...edge, hidden: false }));
  const normalizedEdges = [
    ...(firstBodyNodeId
      ? [functionBoundaryEdge({
          id: `${boundary.argumentNodeId}->${firstBodyNodeId}`,
          source: boundary.argumentNodeId,
          target: firstBodyNodeId,
          sourceHandle: "out-2",
          targetHandle: "in-2",
          tone: "argument",
        })]
      : []),
    ...innerEdges,
    ...terminalFunctionEdges({
      edgeTone: boundary.returnEdgeTone,
      returnNodeId: boundary.returnNodeId,
      terminalPrefix: boundary.terminalPrefix,
      terminalSuffix: boundary.terminalSuffix,
      nodes: innerNodes,
    }),
  ];

  return { edges: normalizedEdges, nodes: normalizedNodes };
}

function isFunctionInternalNode(kind: BlueprintFunctionKind, id: string): boolean {
  if (kind === "task-output-map") {
    return id === "task-groups-collection"
      || id === "task-groups-iterator"
      || id.startsWith("task-group-");
  }
  return id === "script-groups-collection" || /^script-[^-]+/.test(id);
}

function isHiddenFunctionNode(kind: BlueprintFunctionKind, hiddenNodeIds: Set<string>, id: string): boolean {
  if (hiddenNodeIds.has(id)) return true;
  if (kind === "task-output-map") return id === "task-groups-iterator";
  return id.startsWith("script-") && id.endsWith("-iterator");
}

type FunctionBoundaryDefinition = {
  argumentNodeId: string;
  argumentOutput: BlueprintPort;
  hiddenFunctionNodeIds: string[];
  returnInput: BlueprintPort;
  returnNodeId: string;
  returnEdgeTone: "script" | "task";
  terminalPrefix: string;
  terminalSuffix: string;
};

function functionBoundaryFor(kind: BlueprintFunctionKind): FunctionBoundaryDefinition {
  if (kind === "task-output-map") {
    return {
      argumentNodeId: "function-task-arguments",
      argumentOutput: {
        cardinality: "single",
        detail: "Current map item passed into BuildTaskOutput",
        label: "task group",
        valueType: "TaskGroup",
      },
      hiddenFunctionNodeIds: ["task-groups-collection", "task-groups-iterator"],
      returnInput: {
        cardinality: "single",
        detail: "Single value returned by BuildTaskOutput for the current map item",
        label: "task output",
        valueType: "TaskOutput",
      },
      returnNodeId: "function-task-return",
      returnEdgeTone: "task",
      terminalPrefix: "task-group-",
      terminalSuffix: "-output",
    };
  }

  return {
    argumentNodeId: "function-script-arguments",
    argumentOutput: {
      cardinality: "single",
      detail: "Current map item passed into BuildScriptSection",
      label: "script group",
      valueType: "ScriptGroup",
    },
    hiddenFunctionNodeIds: ["script-groups-collection"],
    returnInput: {
      cardinality: "single",
      detail: "Single value returned by BuildScriptSection for the current map item",
      label: "script section",
      valueType: "ScriptSection",
    },
    returnNodeId: "function-script-return",
    returnEdgeTone: "script",
    terminalPrefix: "script-",
    terminalSuffix: "-output",
  };
}

function firstFunctionBodyNodeId(boundary: FunctionBoundaryDefinition, nodes: BlueprintNode[]): string | null {
  if (boundary.terminalPrefix === "task-group-") {
    return nodes.find((node) => {
      const inputLabels = node.data.inputs.map((input) => input.label);
      const outputLabels = node.data.outputs.map((output) => output.label);
      return inputLabels.includes("task group") && outputLabels.includes("sheet pdf");
    })?.id ?? null;
  }
  return nodes.find((node) => {
    const inputLabels = node.data.inputs.map((input) => input.label);
    const outputLabels = node.data.outputs.map((output) => output.label);
    return inputLabels.includes("script group") && outputLabels.includes("script pdf");
  })?.id ?? null;
}

function buildFunctionBoundaryNodes(
  boundary: FunctionBoundaryDefinition,
  bodyNodes: BlueprintNode[],
  firstBodyNodeId: string | null,
): BlueprintNode[] {
  const firstBodyNode = bodyNodes.find((node) => node.id === firstBodyNodeId) ?? bodyNodes[0] ?? null;
  const terminalNodes = bodyNodes.filter((node) => node.id.startsWith(boundary.terminalPrefix) && node.id.endsWith(boundary.terminalSuffix));
  const lastBodyNode = terminalNodes[terminalNodes.length - 1] ?? bodyNodes[bodyNodes.length - 1] ?? firstBodyNode;
  const minX = bodyNodes.length > 0 ? Math.min(...bodyNodes.map((node) => node.position.x)) : 0;
  const maxX = bodyNodes.length > 0 ? Math.max(...bodyNodes.map((node) => node.position.x)) : 920;
  const argumentY = firstBodyNode?.position.y ?? 0;
  const returnY = lastBodyNode?.position.y ?? argumentY;

  return [
    {
      id: boundary.argumentNodeId,
      position: { x: minX - 680, y: argumentY },
      type: "blueprint",
      data: {
        title: "Arguments",
        subtitle: "function input",
        detail: "Current map item passed into the function. The outer MAP owns the collection loop; this body receives exactly one item.",
        evidence: [
          "Function arguments are explicit single-item values.",
          "The array iteration belongs to the outer MAP node.",
          "No internal node may read external values directly.",
        ],
        inputs: [],
        outputs: [boundary.argumentOutput],
        outputPreview: `${boundary.argumentOutput.label}\n${boundary.argumentOutput.detail}`,
        stepKind: "transform",
        tone: "source",
        status: "provided",
        meta: [
          { label: "Boundary", value: "arguments" },
          { label: "Output", value: `${boundary.argumentOutput.label} : ${boundary.argumentOutput.valueType ?? "unknown"}` },
        ],
        bodyData: {
          type: "function_boundary",
          boundary: "arguments",
        },
      },
    },
    {
      id: boundary.returnNodeId,
      position: { x: maxX + 680, y: returnY },
      type: "blueprint",
      data: {
        title: "Return",
        subtitle: "function output",
        detail: "Values returned by the function. This node only accepts input sockets, like a Blender group output node.",
        evidence: [
          "Function return values are explicit.",
          "Anything not connected here is not returned from this function view.",
        ],
        inputs: [boundary.returnInput],
        outputs: [],
        outputPreview: `${boundary.returnInput.label}\n${boundary.returnInput.detail}`,
        stepKind: "collect",
        tone: "output",
        status: "returned",
        meta: [
          { label: "Boundary", value: "return" },
          { label: "Input", value: `${boundary.returnInput.label} : ${boundary.returnInput.valueType ?? "unknown"}` },
        ],
        bodyData: {
          type: "function_boundary",
          boundary: "return",
        },
      },
    },
  ];
}

function terminalFunctionEdges({
  edgeTone,
  nodes,
  returnNodeId,
  terminalPrefix,
  terminalSuffix,
}: {
  edgeTone: "script" | "task";
  nodes: BlueprintNode[];
  returnNodeId: string;
  terminalPrefix: string;
  terminalSuffix: string;
}): Edge[] {
  return nodes
    .filter((node) => node.id.startsWith(terminalPrefix) && node.id.endsWith(terminalSuffix))
    .map((node) => functionBoundaryEdge({
      id: `${node.id}->${returnNodeId}`,
      source: node.id,
      target: returnNodeId,
      sourceHandle: "out-2",
      targetHandle: "in-2",
      tone: edgeTone,
    }));
}

function functionBoundaryEdge({
  id,
  source,
  sourceHandle,
  target,
  targetHandle,
  tone,
}: {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  tone: "argument" | "script" | "task";
}): Edge {
  const stroke = tone === "script" ? "#8b5cf6" : "#10b981";
  return {
    id,
    source,
    sourceHandle,
    target,
    targetHandle,
    hidden: false,
    style: {
      stroke,
      strokeLinecap: "round",
      strokeWidth: 2.5,
    },
    data: { renderStyle: "rounded" },
    type: "pipeline",
  };
}

function normalizeFunctionNodePositions(nodes: BlueprintNode[]): BlueprintNode[] {
  if (nodes.length === 0) return nodes;
  const uniqueX = [...new Set(nodes.map((node) => node.position.x))].sort((left, right) => left - right);
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const xByOriginal = new Map(uniqueX.map((x, index) => [x, 40 + index * 680]));

  return nodes.map((node) => ({
    ...node,
    position: {
      x: xByOriginal.get(node.position.x) ?? node.position.x,
      y: node.position.y - minY + 48,
    },
  }));
}

function functionViewLabel(kind: BlueprintFunctionKind): string {
  return kind === "task-output-map"
    ? "Funktion: BuildTaskOutput"
    : "Funktion: BuildScriptSection";
}

function NodeInspector({
  node,
  onRerunExtraction,
  onSelectRun,
  onSelectTraceNode,
  rerunningEngine,
  selectingRunId,
  trace,
}: {
  node: BlueprintNode;
  onRerunExtraction?: (engine: string) => void;
  onSelectRun?: (runId: string) => void;
  onSelectTraceNode: (nodeId: string) => void;
  rerunningEngine?: string | null;
  selectingRunId?: string | null;
  trace: BlueprintTraceStep[];
}) {
  const data = node.data;
  const problems = data.problems ?? [];
  const lossProblems = problems.filter((problem) => problem.label.toLowerCase().includes("image"));
  const lossEvidence = (data.evidence ?? []).filter((item) => /image|asset/i.test(item));
  const extractionVariants = data.extractionVariants ?? [];
  const config = data.config ?? [];
  const evidence = data.evidence ?? [];
  const artifacts = data.artifacts ?? [];
  const metadata = data.meta ?? [];
  const showExtractionActions = data.title === "Extraction Variants" && onRerunExtraction;
  return (
    <div className="min-w-0">
      <h2 className="text-lg font-semibold tracking-tight">{data.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{data.subtitle}</p>
      <p className="mt-4 text-sm leading-6 text-foreground/80">{data.detail}</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MetricTile label="Inputs" value={String(data.inputs.length)} />
        <MetricTile label="Outputs" value={String(data.outputs.length)} />
        <MetricTile label="Problems" value={String(problems.length)} />
      </div>

      <InspectorSection icon={ArrowRight} title="Flow">
        <div className="grid gap-3">
          <PortPanel items={data.inputs} title="Input" />
          <PortPanel items={data.outputs} title="Output" />
        </div>
      </InspectorSection>

      <InspectorSection icon={GitBranch} title="Source trace">
        <SourceTracePanel onSelectNode={onSelectTraceNode} steps={trace} />
      </InspectorSection>

      {lossProblems.length > 0 ? (
        <InspectorSection icon={ImageOff} title="Loss trace" tone="warning">
          <LossTracePanel evidence={lossEvidence} problems={lossProblems} />
        </InspectorSection>
      ) : null}

      {data.live ? (
        <InspectorSection icon={Activity} title="Live state" tone={data.live.status === "failed" ? "warning" : "default"}>
          <LiveStatePanel live={data.live} />
        </InspectorSection>
      ) : null}

      <InspectorSection icon={Eye} title="Preview">
        <RenderedNodePreview node={node} />
      </InspectorSection>

      {extractionVariants.length > 0 ? (
        <InspectorSection icon={GitCompareArrows} title="Extraction variants">
          <ExtractionVariantPanel
            onSelectRun={onSelectRun}
            selectingRunId={selectingRunId}
            variants={extractionVariants}
          />
        </InspectorSection>
      ) : null}

      {problems.length > 0 ? (
        <InspectorSection icon={AlertCircle} title="Problems" tone="warning">
          <div className="grid gap-2">
            {problems.map((problem) => (
              <div className="rounded-2xl bg-background/80 px-3 py-2" key={`${problem.label}:${problem.detail}`}>
                <p className="text-xs font-medium text-destructive">{problem.label}</p>
                <p className="mt-1 text-xs leading-5 text-destructive/80">{problem.detail}</p>
              </div>
            ))}
          </div>
        </InspectorSection>
      ) : null}

      {showExtractionActions ? (
        <InspectorSection icon={RotateCw} title="Run extraction">
          <ExtractionActionButtons
            onRerunExtraction={onRerunExtraction}
            rerunningEngine={rerunningEngine}
            variants={extractionVariants}
          />
        </InspectorSection>
      ) : null}

      {evidence.length > 0 ? (
        <InspectorSection icon={Search} title="Evidence">
          <StringList items={evidence} />
        </InspectorSection>
      ) : null}

      {artifacts.length > 0 ? (
        <InspectorSection icon={FileText} title="Artifacts">
          <StringList items={artifacts} />
        </InspectorSection>
      ) : null}

      {config.length > 0 ? (
        <InspectorSection icon={ClipboardList} title="Config">
          <KeyValuePanel items={config} />
        </InspectorSection>
      ) : null}

      {metadata.length > 0 ? (
        <InspectorSection icon={Database} title="Metadata">
          <KeyValuePanel items={metadata} />
        </InspectorSection>
      ) : null}
    </div>
  );
}

function RenderedNodePreview({ node }: { node: BlueprintNode }) {
  const preview = useMemo(() => buildPipelineNodePreview(node.data), [node.data]);
  return (
    <div className="max-h-[36rem] overflow-auto rounded-2xl bg-background/80 px-3 py-3">
      <NodePreviewContent preview={preview} size="inspector" />
    </div>
  );
}

function ExtractionVariantPanel({
  onSelectRun,
  selectingRunId,
  variants,
}: {
  onSelectRun?: (runId: string) => void;
  selectingRunId?: string | null;
  variants: BlueprintExtractionVariant[];
}) {
  return (
    <div className="grid gap-2">
      {variants.map((variant) => {
        const selecting = selectingRunId === variant.runId;
        return (
          <div className="rounded-2xl bg-background/80 px-3 py-3" key={variant.engine}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{variant.engine}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{variant.configHash}</p>
              </div>
              <Badge variant={variantStatusBadge(variant.status)}>{variant.active ? "active" : variant.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricTile label="Chars" value={variant.chars === null ? "missing" : String(variant.chars)} />
              <MetricTile label="Artifacts" value={String(variant.artifactCount)} />
            </div>
            {variant.preview ? (
              <p className="mt-3 line-clamp-3 rounded-2xl bg-secondary/55 px-3 py-2 text-xs leading-5 text-foreground/80">
                {variant.preview}
              </p>
            ) : null}
            {variant.runId && onSelectRun ? (
              <Button
                className="mt-3 h-8 w-full justify-center rounded-full"
                disabled={variant.active || selecting}
                onClick={() => onSelectRun(variant.runId!)}
                type="button"
                variant={variant.active ? "secondary" : "default"}
              >
                {selecting ? <Spinner aria-hidden /> : <CheckCircle2 aria-hidden className="size-4" />}
                {variant.active ? "Active output" : "Use this output"}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ExtractionActionButtons({
  onRerunExtraction,
  rerunningEngine,
  variants,
}: {
  onRerunExtraction: (engine: string) => void;
  rerunningEngine?: string | null;
  variants: BlueprintExtractionVariant[];
}) {
  const engines = variants.length > 0 ? variants.map((variant) => variant.engine) : ["pdftotext", "docling", "marker"];
  return (
    <>
      {engines.map((engine) => {
        const running = rerunningEngine === engine;
        return (
          <Button
            className="h-9 justify-start rounded-full"
            disabled={Boolean(rerunningEngine)}
            key={engine}
            onClick={() => onRerunExtraction(engine)}
            type="button"
            variant="secondary"
          >
            {running ? <Spinner aria-hidden /> : <RotateCw aria-hidden className="size-4" />}
            Run {engine}
          </Button>
        );
      })}
      <p className="text-xs leading-5 text-muted-foreground">
        Runs create a new immutable extraction variant. Selecting a variant decides which output downstream steps use.
      </p>
    </>
  );
}

function BlueprintNodeCard({ data, id, selected }: NodeProps<BlueprintNode>) {
  const Icon = nodeIcon(data.tone);
  const preview = useMemo(() => buildPipelineNodePreview(data), [data]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const blockingProblems = (data.problems ?? []).filter((problem) => problem.severity === "error");
  const primaryProblem = blockingProblems[0] ?? data.problems?.[0] ?? null;
  const failed = data.status === "failed" || data.live?.status === "failed" || blockingProblems.length > 0;
  const runStage = runStageForNode(data);
  const codexConfig = data.codexConfig;
  const codexBlocked = runStage === "curated" && codexConfig ? !codexConfig.connected || !codexConfig.selectedModel : false;
  const showRunAction = Boolean(data.onRunFromNode && runStage && data.runScope && (selected || failed));
  const boundaryKind = functionBoundaryKind(data.bodyData);
  return (
    <div
      className={cn(
        "relative min-h-[300px] w-[560px] rounded-3xl bg-background shadow-lg shadow-black/10 transition-shadow",
        boundaryKind === "arguments" ? "bg-sky-50 shadow-sky-900/10 ring-2 ring-sky-300/80" : "",
        boundaryKind === "return" ? "bg-emerald-50 shadow-emerald-900/10 ring-2 ring-emerald-300/80" : "",
        failed ? "bg-destructive/5 shadow-destructive/20 ring-2 ring-destructive/55" : "",
        liveNodeClass(data.live),
        selected ? "outline outline-2 outline-primary/60" : "",
      )}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect?.(id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          data.onSelect?.(id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative z-10 h-full overflow-visible rounded-3xl px-4 py-3">
        <NodeLiveIndicator live={data.live} />
        <span aria-hidden className={cn("absolute inset-x-6 top-0 h-1 rounded-b-full", boundaryStripeClass(boundaryKind) ?? stepKindStripeClass(data.stepKind))} />
        <div className="flex items-start gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", boundaryIconClass(boundaryKind) ?? nodeToneClass(data.tone))}>
            <Icon aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-5 text-foreground">{data.title}</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{data.subtitle}</p>
          </div>
        </div>
        <ChannelRows inputs={data.inputs} outputs={data.outputs} />

        {data.progressItems?.length ? (
          <NodeProgressList
            className="mt-3"
            items={data.progressItems}
            onSelect={data.onToggleHiddenItem}
          />
        ) : null}

        <FunctionSlot className="mt-3 w-full" data={data} />
        <CodexNodeConfig data={data} />
        {primaryProblem || showRunAction ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {primaryProblem ? (
              <div className="min-w-[250px] flex-[1_1_250px] rounded-2xl bg-destructive/10 px-3 py-2 text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold leading-4">{primaryProblem.label}</p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-destructive/85">
                      {primaryProblem.detail}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {showRunAction ? (
              <Button
                className={cn(
                  "h-8 min-w-[250px] flex-[1_1_250px] justify-center rounded-full text-xs font-semibold",
                  failed ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "",
                )}
                disabled={data.runActionDisabled || codexBlocked}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  data.onRunFromNode?.({
                    mode: "from",
                    scope: data.runScope!,
                    startStage: runStage!,
                  });
                }}
                type="button"
                variant={failed ? "destructive" : "secondary"}
              >
                {data.runActionRunning ? <Spinner aria-hidden /> : failed ? <RotateCw aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
                {failed ? "Ab Fehler neu starten" : "Ab hier starten"}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl bg-secondary/45 px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Output</span>
            <div className="flex items-center gap-1">
              {data.problems?.length ? (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  {data.problems.length}
                </span>
              ) : null}
              <button
                aria-label="Open output preview"
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-background/80 px-2.5 text-[11px] font-semibold text-muted-foreground shadow-sm shadow-black/10 transition hover:text-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setPreviewOpen(true);
                }}
                type="button"
              >
                <Maximize2 aria-hidden className="size-3.5" />
                Anschauen
              </button>
            </div>
          </div>
          <div className="max-h-[8.5rem] overflow-auto pr-1" onClick={(event) => event.stopPropagation()}>
            <NodePreviewContent preview={preview} size="node" />
          </div>
        </div>
      </div>
      <NodePreviewDialog
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        preview={preview}
        title={data.title}
      />
    </div>
  );
}

function FunctionSlot({ className, data }: { className?: string; data: BlueprintNode["data"] }) {
  const functionKind = functionKindForNode(data);
  const bodyData = functionBodyData(data.bodyData);
  if (!functionKind || !bodyData) return null;

  const bodySteps = bodyData.contract.body.slice(0, 3);
  const inputPort = bodyData.contract.inputNode.outputs[0];
  const outputPort = bodyData.contract.outputNode.inputs[0];

  return (
    <button
      className={cn(
        "block rounded-3xl bg-secondary/35 p-2 text-left shadow-inner shadow-black/[0.03] transition hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      data-function-kind={functionKind}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        data.onOpenFunction?.(functionKind);
      }}
      type="button"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
          Function body
        </p>
        <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm shadow-black/10">
          Öffnen
        </span>
      </div>
      <div className="relative rounded-2xl bg-background px-3 py-2 shadow-sm shadow-black/10">
        <span aria-hidden className="absolute left-0 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-4 ring-background" />
        <span aria-hidden className="absolute right-0 top-1/2 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-4 ring-background" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[10px] font-semibold text-muted-foreground">
          <span className="truncate">{inputPort?.label ?? "input"}</span>
          <ArrowRight aria-hidden className="size-3.5 text-foreground/40" />
          <span className="truncate text-right">{outputPort?.label ?? "output"}</span>
        </div>
        <div className="mt-2 rounded-2xl bg-secondary/45 px-3 py-2">
          <p className="truncate font-mono text-[12px] font-semibold text-foreground">
            {bodyData.name}(item) -&gt; output
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
            {bodySteps.join(" -> ")}
          </p>
        </div>
      </div>
    </button>
  );
}

function CodexNodeConfig({ data }: { data: BlueprintNode["data"] }) {
  const config = data.codexConfig;
  if (!config) return null;

  const selectedModelKnown = config.modelOptions.some((model) => model.id === config.selectedModel);
  const modelOptions = config.modelOptions.length > 0
    ? config.modelOptions.map((model) => ({ label: model.label || model.id, value: model.id }))
    : [{ label: config.loading ? "Modelle laden" : "Default Codex", value: "" }];
  if (config.modelOptions.length > 0 && !selectedModelKnown) {
    modelOptions.unshift({ label: "Modell wählen", value: "" });
  }
  const selectedModel = selectedModelKnown ? config.selectedModel : "";
  const ready = config.connected && Boolean(config.selectedModel);

  return (
    <div
      className="mt-3 rounded-3xl bg-secondary/35 px-3 py-3"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid min-w-0 flex-1 gap-1">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
            Codex model
          </span>
          <select
            className="h-9 min-w-0 rounded-full bg-background px-3 text-xs font-semibold text-foreground outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            disabled={config.loading}
            onChange={(event) => config.onModelChange(event.target.value)}
            value={selectedModel}
          >
            {modelOptions.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!ready ? (
          <Button
            className="h-9 shrink-0 justify-center rounded-full px-3 text-xs"
            disabled={config.connecting || config.loading}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              config.onConnect();
            }}
            type="button"
            variant="secondary"
          >
            {config.connecting || config.loading ? <Spinner aria-hidden /> : null}
            {config.connecting ? "Login offen" : "ChatGPT verbinden"}
          </Button>
        ) : null}
      </div>
      {config.error ? (
        <p className="mt-2 text-[11px] leading-4 text-destructive">{config.error}</p>
      ) : null}
      {config.deviceCode ? (
        <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-background/70 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Code</p>
            <p className="font-mono text-sm font-semibold tracking-wide text-foreground">{config.deviceCode.userCode}</p>
          </div>
          <Button asChild className="h-8 rounded-full px-3 text-xs" type="button" variant="secondary">
            <a href={config.deviceCode.verificationUri} rel="noreferrer" target="_blank">
              Öffnen
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type FunctionBodyData = {
  contract: {
    body: string[];
    inputNode: {
      outputs: BlueprintPort[];
      title: string;
    };
    outputNode: {
      inputs: BlueprintPort[];
      title: string;
    };
  };
  name: string;
  type: "map_function";
};

function functionBodyData(value: unknown): FunctionBodyData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<FunctionBodyData>;
  if (record.type !== "map_function" || typeof record.name !== "string") return null;
  if (!record.contract || !Array.isArray(record.contract.body)) return null;
  if (!record.contract.inputNode || !Array.isArray(record.contract.inputNode.outputs)) return null;
  if (!record.contract.outputNode || !Array.isArray(record.contract.outputNode.inputs)) return null;
  return record as FunctionBodyData;
}

function functionBoundaryKind(value: unknown): "arguments" | "return" | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { boundary?: unknown; type?: unknown };
  if (record.type !== "function_boundary") return null;
  return record.boundary === "arguments" || record.boundary === "return" ? record.boundary : null;
}

function boundaryStripeClass(kind: "arguments" | "return" | null): string | null {
  if (kind === "arguments") return "bg-sky-500";
  if (kind === "return") return "bg-emerald-500";
  return null;
}

function boundaryIconClass(kind: "arguments" | "return" | null): string | null {
  if (kind === "arguments") return "bg-sky-100 text-sky-700";
  if (kind === "return") return "bg-emerald-100 text-emerald-700";
  return null;
}

function functionKindForNode(data: BlueprintNode["data"]): BlueprintFunctionKind | null {
  const bodyData = functionBodyData(data.bodyData);
  if (!bodyData) return null;
  if (bodyData.name === "BuildTaskOutput") return "task-output-map";
  if (bodyData.name === "BuildScriptSection") return "script-output-map";
  return null;
}

function runStageForNode(data: BlueprintNode["data"]): BlueprintRunStage | null {
  const title = data.title.toLowerCase();
  const subtitle = data.subtitle.toLowerCase();
  const detail = data.detail.toLowerCase();
  const combined = `${title} ${subtitle} ${detail}`;
  if (/codex|curated|curation|final|output|website/.test(combined)) return "curated";
  if (/extract|section|page|pdf|document|ocr/.test(combined)) return "extracted";
  if (/raw|import|material/.test(combined)) return "raw";
  if (/inventory|resource set|course/.test(combined)) return "inventory";
  return null;
}

function isCodexNodeData(data: BlueprintNode["data"]): boolean {
  const combined = `${data.title} ${data.subtitle} ${data.detail}`.toLowerCase();
  return /\bcodex\b|curated|curation/.test(combined);
}

function NodePreviewDialog({
  onOpenChange,
  open,
  preview,
  title,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  preview: PipelineNodePreview;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90dvh,920px)] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-[1.75rem] border-0 p-0 shadow-2xl sm:max-w-[min(96vw,1200px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="border-b border-border/50 px-5 py-4 pr-14">
          <DialogTitle className="truncate text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <NodePreviewContent preview={preview} size="modal" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NodePreviewContent({
  preview,
  size,
}: {
  preview: PipelineNodePreview;
  size: "inspector" | "modal" | "node";
}) {
  if (preview.kind === "mixed") {
    return (
      <div className={cn("grid", size === "node" ? "gap-2" : "gap-4")}>
        <div className={cn("grid", size === "node" ? "gap-2" : "gap-3")}>
          {preview.fields.map((field) => (
            <RenderedPreviewField field={field} key={`${field.path}:${field.label}`} size={size} />
          ))}
        </div>
        <div
          className={cn(
            "rounded-2xl bg-secondary/55",
            size === "node" ? "px-2 py-1.5" : "px-4 py-3",
          )}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
            Raw data
          </p>
          <JsonPreviewText text={preview.jsonText} size={size} />
        </div>
      </div>
    );
  }

  if (preview.kind === "json") {
    return <JsonPreviewText text={preview.text} size={size} />;
  }

  return (
    <MarkdownRenderer
      className={cn(
        "break-words text-foreground",
        size === "node"
          ? "space-y-1.5 text-[12px] leading-5 text-foreground/85 [&_.katex-display]:my-1 [&_code]:text-[11px] [&_h3]:!mt-0 [&_h3]:text-[13px] [&_h4]:!mt-0 [&_h4]:text-[12px] [&_ol]:ml-4 [&_pre]:rounded-xl [&_pre]:p-2 [&_pre]:text-[11px] [&_ul]:ml-4"
          : "max-w-none space-y-4 text-sm leading-6 [&_.katex-display]:overflow-auto [&_pre]:rounded-2xl [&_pre]:p-3",
      )}
      text={size === "node" ? compactNodeMarkdownPreview(preview.text) : preview.text}
    />
  );
}

function RenderedPreviewField({
  field,
  size,
}: {
  field: BlueprintRenderedField;
  size: "inspector" | "modal" | "node";
}) {
  return (
    <section className={cn("rounded-2xl bg-background/80", size === "node" ? "px-2 py-1.5" : "px-4 py-3")}>
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate text-[11px] font-semibold text-foreground/80">{field.label}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] leading-4 text-muted-foreground">
          {field.path}
        </span>
      </div>
      {field.description ? (
        <p className="mb-2 text-[11px] leading-4 text-muted-foreground">{field.description}</p>
      ) : null}
      {field.type === "markdown" ? (
        <MarkdownRenderer
          className={cn(
            "break-words text-foreground",
            size === "node"
              ? "space-y-1.5 text-[12px] leading-5 text-foreground/85 [&_.katex-display]:my-1 [&_code]:text-[11px] [&_h3]:!mt-0 [&_h3]:text-[13px] [&_h4]:!mt-0 [&_h4]:text-[12px] [&_ol]:ml-4 [&_pre]:rounded-xl [&_pre]:p-2 [&_pre]:text-[11px] [&_ul]:ml-4"
              : "max-w-none space-y-4 text-sm leading-6 [&_.katex-display]:overflow-auto [&_pre]:rounded-2xl [&_pre]:p-3",
          )}
          text={size === "node" ? compactNodeMarkdownPreview(field.value) : field.value}
        />
      ) : field.type === "json" ? (
        <JsonPreviewText text={field.value} size={size} />
      ) : (
        <p className={cn("whitespace-pre-wrap break-words text-foreground/80", size === "node" ? "text-[11px] leading-4" : "text-sm leading-6")}>
          {field.value}
        </p>
      )}
    </section>
  );
}

function compactNodeMarkdownPreview(markdown: string): string {
  const blocks = markdown.trim().split(/\n{2,}/).filter(Boolean);
  const kept: string[] = [];
  let hidden = 0;
  for (const block of blocks) {
    const image = block.match(/^!\[([^\]]*)]\(/);
    const next = image ? `[image: ${image[1]?.trim() || "asset"}]` : block;
    const nextLength = [...kept, next].join("\n\n").length;
    if (kept.length >= 6 || nextLength > 700) {
      hidden += 1;
      continue;
    }
    kept.push(next);
  }
  if (hidden > 0) {
    kept.push(`... ${hidden} more block${hidden === 1 ? "" : "s"}`);
  }
  return kept.join("\n\n");
}

function JsonPreviewText({
  size,
  text,
}: {
  size: "inspector" | "modal" | "node";
  text: string;
}) {
  const displayText = size === "node" ? compactNodeJsonPreview(text) : text;
  return (
    <pre
      className={cn(
        "overflow-auto whitespace-pre-wrap break-words font-mono text-foreground/80",
        size === "node" ? "text-[11px] leading-5" : "text-xs leading-5",
      )}
    >
      {displayText}
    </pre>
  );
}

function compactNodeJsonPreview(text: string): string {
  const lines = text.split("\n");
  const maxLines = 14;
  const maxChars = 900;
  let compact = lines.slice(0, maxLines).join("\n");
  if (compact.length > maxChars) {
    compact = `${compact.slice(0, maxChars).trimEnd()}\n...`;
  }
  const hiddenLines = lines.length - maxLines;
  if (hiddenLines > 0) {
    compact = `${compact}\n... ${hiddenLines} more line${hiddenLines === 1 ? "" : "s"}`;
  }
  return compact;
}

function NodeProgressList({
  className,
  items,
  onSelect,
}: {
  className?: string;
  items: NonNullable<BlueprintNode["data"]["progressItems"]>;
  onSelect?: (itemId: string) => void;
}) {
  return (
    <div
      className={cn("max-h-44 overflow-auto rounded-2xl bg-secondary/45 px-2 py-1.5", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Items</span>
        <span className="rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const StatusIcon = progressStatusIcon(item.status);
          return (
          <button
            className={cn(
              "grid min-w-[154px] flex-[1_1_154px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-xl px-1.5 py-1 text-left transition-colors",
              item.selected ? "bg-background text-foreground shadow-sm shadow-black/10" : "text-foreground/80 hover:bg-background/70",
            )}
            key={item.id}
            onClick={() => onSelect?.(item.id)}
            type="button"
          >
            <span className={cn("grid size-4 place-items-center rounded-full", progressStatusClass(item.status))}>
              <StatusIcon aria-hidden className={cn("size-2.5", item.status === "loading" ? "animate-spin" : "")} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold leading-3">{item.title}</span>
              {item.detail && (item.status === "failed" || item.status === "needs_review") ? (
                <span className="block truncate text-[9px] leading-3 text-muted-foreground">{item.detail}</span>
              ) : null}
            </span>
            <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold leading-3 text-muted-foreground">
              {progressStatusLabel(item.status)}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function progressStatusLabel(status: NonNullable<BlueprintNode["data"]["progressItems"]>[number]["status"]): string {
  if (status === "done") return "done";
  if (status === "failed") return "error";
  if (status === "loading") return "run";
  if (status === "needs_review") return "review";
  if (status === "missing") return "missing";
  return "open";
}

function progressStatusIcon(status: NonNullable<BlueprintNode["data"]["progressItems"]>[number]["status"]) {
  if (status === "done") return CheckCircle2;
  if (status === "failed") return AlertCircle;
  if (status === "loading") return LoaderCircle;
  return Activity;
}

function progressStatusClass(status: NonNullable<BlueprintNode["data"]["progressItems"]>[number]["status"]): string {
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "loading") return "bg-blue-100 text-blue-700";
  if (status === "needs_review") return "bg-amber-100 text-amber-700";
  if (status === "missing") return "bg-rose-100 text-rose-700";
  return "bg-background text-muted-foreground";
}

const HANDLE_POSITIONS = [16, 30, 44, 58, 72, 86] as const;
const CHANNEL_SLOTS_BY_COUNT: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 2, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function ChannelRows({ inputs, outputs }: { inputs: BlueprintPort[]; outputs: BlueprintPort[] }) {
  const inputPorts = Array.from(portsBySlot(inputs).entries()).sort(([left], [right]) => left - right);
  const outputPorts = Array.from(portsBySlot(outputs).entries()).sort(([left], [right]) => left - right);
  const rowCount = Math.max(inputPorts.length, outputPorts.length);
  if (rowCount === 0) return null;

  return (
    <div className="-mx-4 mt-3 border-y border-foreground/[0.04] bg-secondary/20 py-1">
      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const input = inputPorts[rowIndex];
        const output = outputPorts[rowIndex];
        return (
          <div
            className="relative grid min-h-6 grid-cols-2 items-center gap-3 px-6 text-[10px] font-semibold leading-4 text-foreground/70"
            key={`channel-row-${rowIndex}`}
          >
            {input ? <ChannelPortMarker direction="input" port={input[1]} slot={input[0]} /> : null}
            {output ? <ChannelPortMarker direction="output" port={output[1]} slot={output[0]} /> : null}
            {input ? <ChannelLabel direction="input" port={input[1]} /> : <span aria-hidden />}
            {output ? <ChannelLabel direction="output" port={output[1]} /> : <span aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

function ChannelLabel({
  direction,
  port,
}: {
  direction: "input" | "output";
  port: BlueprintPort;
}) {
  return (
    <span
      className={cn(
        "relative min-w-0 truncate rounded-full px-2 py-0.5",
        portCardinality(port) === "array" ? "font-bold" : "",
        direction === "output" ? "justify-self-end text-right" : "justify-self-start",
      )}
      title={[port.label, port.valueType, portCardinality(port), port.detail, port.state].filter(Boolean).join(" · ")}
    >
      {port.label}
    </span>
  );
}

function ChannelPortMarker({
  direction,
  port,
  slot,
}: {
  direction: "input" | "output";
  port: BlueprintPort;
  slot: number;
}) {
  const cardinality = portCardinality(port);
  const edgePosition = direction === "input"
    ? { left: 0, transform: "translate(-50%, -50%)" }
    : { right: 0, transform: "translate(50%, -50%)" };

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 z-50 size-5 border-[5px] border-background shadow-md shadow-black/25",
          cardinality === "array" ? "rounded-md" : "rounded-full",
          cardinality === "optional" ? "ring-2 ring-background/80 ring-offset-2 ring-offset-background" : "",
          portColorClass(port),
        )}
        data-channel-marker="true"
        style={edgePosition}
      />
      <Handle
        className={cn(
          "pointer-events-auto !absolute !top-1/2 !z-40 !size-5 !border-0 !bg-transparent !opacity-0",
          cardinality === "array" ? "!rounded-md" : "!rounded-full",
        )}
        id={`${direction === "input" ? "in" : "out"}-${slot}`}
        position={direction === "input" ? Position.Left : Position.Right}
        style={edgePosition}
        type={direction === "input" ? "target" : "source"}
      />
    </>
  );
}

function portsBySlot(items: BlueprintPort[]): Map<number, BlueprintPort> {
  const slots = CHANNEL_SLOTS_BY_COUNT[Math.min(6, Math.max(1, items.length))] ?? CHANNEL_SLOTS_BY_COUNT[1];
  const map = new Map<number, BlueprintPort>();
  items.slice(0, 6).forEach((item, index) => {
    map.set(slots[index] ?? index, item);
  });
  return map;
}

function portColorClass(port: BlueprintPort): string {
  const value = `${port.label} ${port.detail ?? ""} ${port.state ?? ""}`.toLowerCase();
  if (/missing|failed|problem|review/.test(value)) return "!bg-destructive";
  if (/published|website|output|ready|task draft|task/.test(value)) return "!bg-emerald-500";
  if (/solution/.test(value)) return "!bg-rose-500";
  if (/extract|ocr|active extraction/.test(value)) return "!bg-blue-500";
  if (/script|section|block/.test(value)) return "!bg-violet-500";
  if (/page/.test(value)) return "!bg-sky-500";
  if (/pdf|file|resource|course/.test(value)) return "!bg-amber-500";
  return "!bg-muted-foreground";
}

function portColorHex(port: BlueprintPort | null | undefined): string {
  if (!port) return "#737373";
  const value = `${port.label} ${port.detail ?? ""} ${port.state ?? ""}`.toLowerCase();
  if (/missing|failed|problem|review/.test(value)) return "#dc2626";
  if (/published|website|output|ready|task draft|task/.test(value)) return "#10b981";
  if (/solution/.test(value)) return "#f43f5e";
  if (/extract|ocr|active extraction/.test(value)) return "#3b82f6";
  if (/script|section|block/.test(value)) return "#8b5cf6";
  if (/page/.test(value)) return "#0ea5e9";
  if (/pdf|file|resource|course/.test(value)) return "#f59e0b";
  return "#737373";
}

function portCardinality(port: BlueprintPort): NonNullable<BlueprintPort["cardinality"]> {
  if (port.cardinality) return port.cardinality;
  if (/\[\]/.test(port.label)) return "array";
  if (/\?|optional/i.test(`${port.label} ${port.detail ?? ""}`)) return "optional";
  return "single";
}

function edgeColor(edge: Pick<Edge, "label" | "source" | "sourceHandle">, nodeById: Map<string, BlueprintGraphNode>): string {
  const source = nodeById.get(edge.source);
  if (source?.type !== "blueprint") return "#737373";
  const semanticPort = source.data.outputs.find((port) => portMatchesEdgeLabel(port, edge.label));
  if (semanticPort) return portColorHex(semanticPort);
  const slot = Number(edge.sourceHandle?.replace("out-", ""));
  if (Number.isFinite(slot)) {
    return portColorHex(portForSlot(source.data.outputs, slot));
  }
  return portColorHex(source.data.outputs[0]);
}

function portForSlot(items: BlueprintPort[], slot: number): BlueprintPort | undefined {
  const slotPorts = portsBySlot(items);
  const exact = slotPorts.get(slot);
  if (exact) return exact;
  let nearest: { distance: number; port: BlueprintPort } | null = null;
  for (const [candidateSlot, port] of slotPorts.entries()) {
    const distance = Math.abs(candidateSlot - slot);
    if (!nearest || distance < nearest.distance) nearest = { distance, port };
  }
  return nearest?.port ?? items[0];
}

function portMatchesEdgeLabel(port: BlueprintPort, label: Edge["label"]): boolean {
  if (typeof label !== "string") return false;
  const edgeLabel = label.toLowerCase();
  const portLabel = port.label.toLowerCase();
  if (edgeLabel.includes("task") && portLabel.includes("task")) return true;
  if (edgeLabel.includes("script") && portLabel.includes("script")) return true;
  if (edgeLabel.includes("review") && portLabel.includes("review")) return true;
  if (edgeLabel.includes("sheet") && portLabel.includes("sheet")) return true;
  if (edgeLabel.includes("solution") && portLabel.includes("solution")) return true;
  if (edgeLabel.includes("pdf") && portLabel.includes("pdf")) return true;
  if (edgeLabel.includes("publish") && /output|task|script/.test(portLabel)) return true;
  return false;
}

function BlueprintGroupFrame({ data }: NodeProps<Extract<BlueprintGraphNode, { type: "frame" }>>) {
  const stage = data.frame?.variant === "stage";
  return (
    <div
      className={cn(
        "pointer-events-none border-0",
        stage
          ? "rounded-[24px] bg-background/40 ring-1 ring-foreground/[0.04]"
          : "rounded-[28px] bg-foreground/[0.035] shadow-inner",
      )}
      style={{ height: data.frame?.height ?? 240, width: data.frame?.width ?? 480 }}
    >
      <div className={cn("flex items-center justify-between", stage ? "px-4 py-4" : "px-5 py-3")}>
        <p className={cn("font-semibold", stage ? "text-[13px] text-foreground/55" : "text-sm text-foreground/70")}>
          {data.title}
        </p>
        <p className={cn("font-medium text-muted-foreground", stage ? "text-[11px]" : "text-xs")}>{data.subtitle}</p>
      </div>
    </div>
  );
}

function LegendPill({ kind, label }: { kind: "collect" | "split" | "transform"; label: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", stepKindBadgeClass(kind))}>
      {label}
    </span>
  );
}

function EdgeStyleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function isBlueprintNode(node: BlueprintGraphNode): node is BlueprintNode {
  return node.type === "blueprint";
}

function InspectorSection({
  children,
  icon: Icon,
  title,
  tone = "default",
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
  tone?: "default" | "warning";
}) {
  return (
    <section className={cn("mt-4 rounded-3xl px-3 py-3", tone === "warning" ? "bg-destructive/10" : "bg-background/50")}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("grid size-7 place-items-center rounded-full", tone === "warning" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground")}>
          <Icon aria-hidden className="size-3.5" />
        </span>
        <h3 className={cn("text-sm font-semibold", tone === "warning" ? "text-destructive" : "text-foreground")}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/70 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PortPanel({ items, title }: { items: BlueprintPort[]; title: string }) {
  return (
    <div className="rounded-2xl bg-background/70 px-3 py-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/60 px-3 py-2" key={`${title}:${item.label}:${item.detail ?? ""}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs font-medium text-foreground">{item.label}</p>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <Badge variant="outline">{portCardinality(item)}</Badge>
                {item.state ? <Badge variant={item.state === "missing" || item.state === "failed" ? "destructive" : "outline"}>{item.state}</Badge> : null}
              </div>
            </div>
            {item.valueType ? <p className="mt-1 font-mono text-[10px] leading-4 text-muted-foreground">{item.valueType}</p> : null}
            {item.detail ? <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyValuePanel({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div className="rounded-2xl bg-background/70 px-3 py-2" key={`${item.label}:${item.value}`}>
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 break-words text-xs font-medium text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <p className="break-words rounded-2xl bg-background/70 px-3 py-2 text-xs leading-5 text-foreground" key={item}>
          {item}
        </p>
      ))}
    </div>
  );
}

function variantStatusBadge(status: BlueprintExtractionVariant["status"]): "default" | "destructive" | "outline" | "secondary" {
  if (status === "active" || status === "ok") return "default";
  if (status === "failed") return "destructive";
  if (status === "missing") return "outline";
  return "secondary";
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

function stepKindBadgeClass(kind: "collect" | "split" | "transform"): string {
  if (kind === "collect") return "bg-teal-500/10 text-teal-800";
  if (kind === "split") return "bg-amber-500/15 text-amber-800";
  return "bg-zinc-500/10 text-zinc-800";
}

function stepKindStripeClass(kind: "collect" | "split" | "transform"): string {
  if (kind === "collect") return "bg-teal-500/70";
  if (kind === "split") return "bg-amber-500/80";
  return "bg-zinc-500/55";
}

function stepKindLabel(kind: "collect" | "split" | "transform"): string {
  if (kind === "collect") return "N -> 1";
  if (kind === "split") return "1 -> N";
  return "1 -> 1";
}
