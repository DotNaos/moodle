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
  PipelineCurationChecklist,
  PipelineCurationChecklistItem,
  PipelineCurationChecklistItemId,
  PipelineCurationChecklistItemStatus,
  PipelineDiagnostic,
  PipelineDiagnosticLevel,
  PipelineElementDecision,
  PipelineElementDecisionActor,
  PipelineElementDecisionOutcome,
  PipelineEngine,
  PipelineExternalId,
  PipelineId,
  PipelineOwnership,
  PipelinePDFElementKind,
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
  codexCurationRunWithImageReview,
  droppedAndUnusedTraceEdges,
  droppedAndUnusedTraceNodes,
  highPerformanceComputingResources,
  highPerformanceComputingSource,
  ocrComparisonRuns,
} from "./pipeline-fixtures";
