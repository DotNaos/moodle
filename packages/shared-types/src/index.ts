export type MoodleClientSession = {
  moodleSiteUrl: string;
  moodleUserId: number;
  moodleMobileToken: string;
};

export type MoodleClientTarget = "web" | "mobile" | "extension";

export type {
  ActiveRunSelection,
  PipelineArtifactKind,
  PipelineArtifactRef,
  PipelineConfidence,
  PipelineDiagnostic,
  PipelineDiagnosticLevel,
  PipelineEngine,
  PipelineExternalId,
  PipelineId,
  PipelineOwnership,
  PipelinePermission,
  PipelineResource,
  PipelineResourceKind,
  PipelineResourceRelation,
  PipelineResourceRelationType,
  PipelineRun,
  PipelineSource,
  PipelineSourceType,
  PipelineStage,
  PipelineStatus,
  ResourceClassification,
  TraceAction,
  TraceEdge,
  TraceNode,
  TraceNodeKind,
} from "./pipeline";

export {
  activeOcrRunSelection,
  droppedAndUnusedTraceEdges,
  droppedAndUnusedTraceNodes,
  highPerformanceComputingResources,
  highPerformanceComputingSource,
  ocrComparisonRuns,
} from "./pipeline-fixtures";
