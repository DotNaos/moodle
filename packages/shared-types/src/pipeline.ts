export type PipelineId = string;
export type PipelineExternalId = string | number;

export type PipelineSourceType =
  | "moodle_course"
  | "uploaded_pdf_set"
  | "manual_collection"
  | "future_source";

export type PipelineStatus =
  | "not_started"
  | "queued"
  | "running"
  | "ok"
  | "warning"
  | "failed"
  | "needs_review"
  | "stale";

export type PipelineOwnership = "shared" | "user_owned";

export type PipelinePermission =
  | "view_published_output"
  | "request_default_run"
  | "view_pipeline_status"
  | "view_pipeline_inspector"
  | "rerun_pipeline_stage"
  | "select_active_run"
  | "promote_pipeline_output"
  | "publish_pipeline_output";

export type PipelineSource = {
  id: PipelineId;
  type: PipelineSourceType;
  externalId: PipelineExternalId;
  displayName: string;
  status: PipelineStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PipelineResourceKind =
  | "pdf"
  | "folder"
  | "page"
  | "link"
  | "external_tool"
  | "label"
  | "file"
  | "unknown";

export type ResourceClassification =
  | "lecture_material"
  | "assignment_sheet"
  | "solution_pdf"
  | "reference"
  | "interaction"
  | "ignored_allowed"
  | "unknown";

export type PipelineConfidence = "high" | "medium" | "low" | "unknown";

export type PipelineResourceRelationType =
  | "paired_with_solution"
  | "solution_for_assignment"
  | "missing_solution"
  | "derived_from"
  | "related_to";

export type PipelineResourceRelation = {
  type: PipelineResourceRelationType;
  resourceId?: PipelineId;
  status: PipelineStatus;
  reason: string;
};

export type PipelineResource = {
  id: PipelineId;
  sourceId: PipelineId;
  externalId: PipelineExternalId;
  title: string;
  kind: PipelineResourceKind;
  fileHash?: string;
  classification: ResourceClassification;
  classificationReason: string;
  classificationConfidence: PipelineConfidence;
  status: PipelineStatus;
  relations?: PipelineResourceRelation[];
  url?: string;
  sectionName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PipelineStage =
  | "fetch_source"
  | "classify_resources"
  | "pair_assignment_solutions"
  | "download_resource"
  | "render_pages"
  | "extract_pages"
  | "extract_text"
  | "extract_images"
  | "detect_blocks"
  | "codex_curate"
  | "publish_output";

export type PipelineEngine =
  | "moodle_api"
  | "manual"
  | "poppler"
  | "pdftotext"
  | "pdftohtml"
  | "docling"
  | "marker"
  | "codex"
  | "unknown";

export type PipelineArtifactKind =
  | "course_inventory"
  | "classification_result"
  | "resource_pairing"
  | "pdf_file"
  | "page_image"
  | "ocr_text"
  | "extracted_image"
  | "document_block"
  | "task_draft"
  | "script_draft"
  | "published_task"
  | "published_script"
  | "review_item";

export type PipelineArtifactRef = {
  id: PipelineId;
  kind: PipelineArtifactKind;
  uri?: string;
  storageKey?: string;
  checksum?: string;
  pageNumber?: number;
  blockId?: PipelineId;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PipelineRun = {
  id: PipelineId;
  sourceId: PipelineId;
  resourceId?: PipelineId;
  fileHash?: string;
  stage: PipelineStage;
  engine: PipelineEngine;
  configHash: string;
  ownership: PipelineOwnership;
  createdBy: string;
  status: PipelineStatus;
  artifacts: PipelineArtifactRef[];
  diagnostics?: PipelineDiagnostic[];
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
};

export type ActiveRunSelection = {
  sourceId: PipelineId;
  resourceId?: PipelineId;
  stage: PipelineStage;
  activeRunId: PipelineId;
  selectedBy: string;
  selectedAt: string;
  reason: string;
};

export type TraceNodeKind =
  | "source"
  | "resource"
  | "page"
  | "block"
  | "process"
  | "artifact"
  | "review"
  | "output";

export type TraceNode = {
  id: PipelineId;
  kind: TraceNodeKind;
  label: string;
  sourceId: PipelineId;
  resourceId?: PipelineId;
  runId?: PipelineId;
  artifactId?: PipelineId;
  status: PipelineStatus;
  metadata?: Record<string, string | number | boolean | null>;
};

export type TraceAction =
  | "kept"
  | "rewritten"
  | "split"
  | "merged"
  | "moved"
  | "dropped"
  | "unused_needs_review"
  | "generated"
  | "selected";

export type TraceEdge = {
  id: PipelineId;
  sourceNodeId: PipelineId;
  targetNodeId: PipelineId;
  stage: PipelineStage;
  action: TraceAction;
  status: PipelineStatus;
  reason: string;
  runId?: PipelineId;
};

export type PipelineDiagnosticLevel = "info" | "warning" | "error";

export type PipelineDiagnostic = {
  level: PipelineDiagnosticLevel;
  code: string;
  message: string;
  nodeId?: PipelineId;
  artifactId?: PipelineId;
};
