import type {
  ActiveRunSelection,
  PipelineResource,
  PipelineRun,
  PipelineSource,
  TraceEdge,
  TraceNode,
} from "./pipeline";

export const highPerformanceComputingSource = {
  id: "source:moodle-course:22584",
  type: "moodle_course",
  externalId: 22584,
  displayName: "High Performance Computing",
  status: "ok",
} satisfies PipelineSource;

export const highPerformanceComputingResources = [
  {
    id: "resource:moodle:947709",
    sourceId: highPerformanceComputingSource.id,
    externalId: 947709,
    title: "Teil 01",
    kind: "pdf",
    fileHash: "sha256:teil-01",
    classification: "lecture_material",
    classificationReason: 'title starts with "Teil" and file is a PDF',
    classificationConfidence: "high",
    status: "ok",
  },
  {
    id: "resource:moodle:947711",
    sourceId: highPerformanceComputingSource.id,
    externalId: 947711,
    title: "Aufgabenblatt 01",
    kind: "pdf",
    fileHash: "sha256:aufgabenblatt-01",
    classification: "assignment_sheet",
    classificationReason: 'title contains "Aufgabenblatt 01" and no solution keyword',
    classificationConfidence: "high",
    status: "ok",
    relations: [
      {
        type: "paired_with_solution",
        resourceId: "resource:moodle:947712",
        status: "ok",
        reason: "same normalized sheet number",
      },
    ],
  },
  {
    id: "resource:moodle:947712",
    sourceId: highPerformanceComputingSource.id,
    externalId: 947712,
    title: "Aufgabenblatt 01 Lösung",
    kind: "pdf",
    fileHash: "sha256:aufgabenblatt-01-loesung",
    classification: "solution_pdf",
    classificationReason: 'title contains "Aufgabenblatt 01" and "Lösung"',
    classificationConfidence: "high",
    status: "needs_review",
    relations: [
      {
        type: "solution_for_assignment",
        resourceId: "resource:moodle:947711",
        status: "ok",
        reason: "same normalized sheet number",
      },
    ],
  },
  {
    id: "resource:moodle:947739",
    sourceId: highPerformanceComputingSource.id,
    externalId: 947739,
    title: "Aufgabenblatt 09",
    kind: "pdf",
    fileHash: "sha256:aufgabenblatt-09",
    classification: "assignment_sheet",
    classificationReason: 'title contains "Aufgabenblatt 09" and no solution keyword',
    classificationConfidence: "high",
    status: "warning",
    relations: [
      {
        type: "missing_solution",
        status: "needs_review",
        reason: "no matching solution PDF found in course inventory",
      },
    ],
  },
] satisfies PipelineResource[];

export const ocrComparisonRuns = [
  {
    id: "run:extract-text:pdftotext:947712",
    sourceId: highPerformanceComputingSource.id,
    resourceId: "resource:moodle:947712",
    fileHash: "sha256:aufgabenblatt-01-loesung",
    stage: "extract_text",
    engine: "pdftotext",
    configHash: "config:pdftotext:default",
    ownership: "shared",
    createdBy: "system",
    status: "warning",
    createdAt: "2026-06-13T00:00:00.000Z",
    artifacts: [
      {
        id: "artifact:ocr-text:pdftotext:947712:p1",
        kind: "ocr_text",
        pageNumber: 1,
        metadata: {
          chars: 12,
          quality: "weak",
        },
      },
    ],
    diagnostics: [
      {
        level: "warning",
        code: "weak_ocr",
        message: "Extracted text is too short for a solution page.",
        artifactId: "artifact:ocr-text:pdftotext:947712:p1",
      },
    ],
  },
  {
    id: "run:extract-text:docling:947712",
    sourceId: highPerformanceComputingSource.id,
    resourceId: "resource:moodle:947712",
    fileHash: "sha256:aufgabenblatt-01-loesung",
    stage: "extract_text",
    engine: "docling",
    configHash: "config:docling:default",
    ownership: "shared",
    createdBy: "system",
    status: "ok",
    createdAt: "2026-06-13T00:05:00.000Z",
    artifacts: [
      {
        id: "artifact:ocr-text:docling:947712:p1",
        kind: "ocr_text",
        pageNumber: 1,
        metadata: {
          chars: 540,
          quality: "ok",
        },
      },
    ],
  },
] satisfies PipelineRun[];

export const codexCurationRunWithImageReview = {
  id: "run:codex-curate:947711",
  sourceId: highPerformanceComputingSource.id,
  resourceId: "resource:moodle:947711",
  fileHash: "sha256:aufgabenblatt-01",
  stage: "codex_curate",
  engine: "codex",
  configHash: "config:codex-curate:layout-v1",
  ownership: "shared",
  createdBy: "system",
  status: "needs_review",
  createdAt: "2026-06-13T00:15:00.000Z",
  artifacts: [
    {
      id: "artifact:page-render:947711:p1",
      kind: "page_render",
      pageNumber: 1,
      storageKey: "courses/22584/runs/codex-curate-947711/pages/page-1.png",
    },
    {
      id: "artifact:element-accountability:947711",
      kind: "element_accountability_manifest",
      storageKey: "courses/22584/runs/codex-curate-947711/element-accountability.json",
    },
    {
      id: "artifact:curation-checklist:947711",
      kind: "curation_checklist",
      storageKey: "courses/22584/runs/codex-curate-947711/checklist.json",
    },
    {
      id: "artifact:rendered-preview:947711",
      kind: "rendered_preview",
      storageKey: "courses/22584/runs/codex-curate-947711/preview.html",
    },
  ],
  curationChecklist: {
    status: "incomplete",
    checkedBy: "codex",
    checkedAt: "2026-06-13T00:16:00.000Z",
    renderPreviewArtifactId: "artifact:rendered-preview:947711",
    items: [
      {
        id: "page_images_reviewed",
        label: "Rendered PDF page images were inspected",
        status: "checked",
        evidenceArtifactId: "artifact:page-render:947711:p1",
      },
      {
        id: "extracted_elements_reviewed",
        label: "Extracted PDF elements were inspected",
        status: "checked",
        evidenceArtifactId: "artifact:element-accountability:947711",
      },
      {
        id: "element_accountability_complete",
        label: "Every detected PDF element has a final outcome",
        status: "failed",
        evidenceArtifactId: "artifact:element-accountability:947711",
        reason: "One extracted task figure still needs a final outcome.",
      },
      {
        id: "layout_reconstructed",
        label: "Task layout was reconstructed from the PDF",
        status: "missing",
      },
      {
        id: "rendered_preview_reviewed",
        label: "Rendered website preview was opened and reviewed",
        status: "checked",
        evidenceArtifactId: "artifact:rendered-preview:947711",
      },
      {
        id: "source_mapping_complete",
        label: "Output source mapping is complete",
        status: "checked",
      },
    ],
  },
  elementDecisions: [
    {
      id: "element-decision:947711:logo",
      sourceElementId: "element:947711:p1:logo",
      sourceArtifactId: "artifact:image:947711:p1:logo",
      sourcePageImageArtifactId: "artifact:page-render:947711:p1",
      elementKind: "image",
      outcome: "ignored",
      reason: "FHGR header logo belongs to the PDF template, not the exercise.",
      decidedBy: "codex",
      confidence: "high",
      pageNumber: 1,
      createdAt: "2026-06-13T00:16:00.000Z",
    },
    {
      id: "element-decision:947711:task-figure",
      sourceElementId: "element:947711:p2:figure",
      sourceArtifactId: "artifact:image:947711:p2:figure",
      sourcePageImageArtifactId: "artifact:page-render:947711:p1",
      elementKind: "figure",
      outcome: "needs_review",
      reason: "The image might be part of the task statement and must be mapped before completion.",
      decidedBy: "codex",
      confidence: "low",
      pageNumber: 2,
      createdAt: "2026-06-13T00:16:00.000Z",
    },
  ],
  diagnostics: [
    {
      level: "warning",
      code: "curation_checklist_incomplete",
      message: "Codex curation cannot be completed while detected PDF elements still need review.",
      artifactId: "artifact:curation-checklist:947711",
    },
  ],
} satisfies PipelineRun;

export const activeOcrRunSelection = {
  sourceId: highPerformanceComputingSource.id,
  resourceId: "resource:moodle:947712",
  stage: "extract_text",
  activeRunId: "run:extract-text:docling:947712",
  selectedBy: "admin",
  selectedAt: "2026-06-13T00:10:00.000Z",
  reason: "docling produced usable text for scanned solution PDF",
} satisfies ActiveRunSelection;

export const droppedAndUnusedTraceNodes = [
  {
    id: "node:block:947711:p1:logo",
    kind: "block",
    label: "block_002 image / logo",
    sourceId: highPerformanceComputingSource.id,
    resourceId: "resource:moodle:947711",
    status: "ok",
    metadata: {
      pageNumber: 1,
      blockType: "image",
      blockLabel: "logo",
    },
  },
  {
    id: "node:review:947711:p2:image-unknown",
    kind: "review",
    label: "image_002 unknown",
    sourceId: highPerformanceComputingSource.id,
    resourceId: "resource:moodle:947711",
    status: "needs_review",
    metadata: {
      pageNumber: 2,
      problem: "extracted image was not referenced in final view",
    },
  },
] satisfies TraceNode[];

export const droppedAndUnusedTraceEdges = [
  {
    id: "edge:drop-logo",
    sourceNodeId: "node:block:947711:p1:logo",
    targetNodeId: "node:output:947711:task-1",
    stage: "codex_curate",
    action: "discarded_template",
    status: "ok",
    reason: "decorative logo",
    runId: "run:codex-curate:947711",
  },
  {
    id: "edge:unused-image-review",
    sourceNodeId: "node:review:947711:p2:image-unknown",
    targetNodeId: "node:review-queue:947711",
    stage: "codex_curate",
    action: "unused_needs_review",
    status: "needs_review",
    reason: "extracted image was not referenced in final task",
    runId: "run:codex-curate:947711",
  },
] satisfies TraceEdge[];
