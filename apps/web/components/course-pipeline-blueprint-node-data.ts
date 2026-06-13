import type { CourseInventoryNode, CourseInventoryTaskGroup } from "@/components/study-pipeline-preview";
import type { BlueprintNodeData, BlueprintProblem, BlueprintStepKind, PipelineRunRecord } from "@/components/course-pipeline-blueprint-model";
import {
  runArtifactSummary,
  runConfig,
  runMeta,
  runPreview,
} from "@/components/course-pipeline-blueprint-run-utils";

export function materializedStepNode({
  detail,
  input,
  output,
  resource,
  status,
  stepKind,
  title,
}: {
  detail: string;
  input: string;
  output: string;
  resource: CourseInventoryNode;
  status: string;
  stepKind: BlueprintStepKind;
  title: string;
}): BlueprintNodeData {
  const pending = status === "pending";
  return {
    title,
    subtitle: resource.name,
    detail,
    evidence: pending ? ["Backend has not exposed this materialized artifact yet."] : [`Materialized from ${resource.name}`],
    inputs: [{ label: input, detail: resource.name }],
    outputs: [{ label: output, detail: pending ? "not stored yet" : "available" }],
    outputPreview: pending ? "No page/section artifact is stored for this resource yet." : `${output} available for ${resource.name}`,
    problems: pending ? [{ label: `${title} missing`, detail: `The ${output} artifact is not available yet.`, severity: "warning" }] : undefined,
    stepKind,
    tone: pending ? "warning" : "process",
    status,
    meta: [
      { label: "Resource", value: resource.name },
      { label: "Artifact", value: output },
    ],
  };
}

export function extractionNodeData({
  activeRunIds,
  resource,
  run,
}: {
  activeRunIds: Set<string>;
  resource: CourseInventoryNode;
  run: PipelineRunRecord | null;
}): BlueprintNodeData {
  if (!run) {
    return {
      title: "Extraction Variants",
      subtitle: "missing",
      detail: "OCR and extraction variants should appear here for this resource.",
      evidence: ["No extraction run record was found for this resource."],
      inputs: [{ label: "sections[]", detail: resource.name }],
      outputs: [{ label: "extracted document", state: "missing" }],
      outputPreview: "Run pdftotext, docling, or marker to create inspectable extraction output.",
      problems: [{ label: "No extraction run", detail: "There is no extraction output to compare or select.", severity: "warning" }],
      stepKind: "split",
      tone: "warning",
      status: "missing",
      meta: [{ label: "Resource", value: resource.name }],
    };
  }
  return {
    title: "Extraction Variants",
    subtitle: `${run.engine} · ${run.configHash}`,
    detail: "Stores OCR/extraction output for this resource. Multiple engine variants should be comparable here.",
    artifacts: runArtifactSummary(run),
    config: runConfig(run),
    evidence: [`Run ${run.id}`, `Engine ${run.engine}`, `${run.artifactRefs?.length ?? 0} artifact refs`],
    inputs: [{ label: "sections[]", detail: resource.name }],
    outputs: [{ label: "extracted document", detail: run.engine, state: run.status }],
    outputPreview: runPreview(run),
    problems: runProblems(run),
    stepKind: "split",
    tone: run.status === "failed" ? "warning" : "run",
    status: run.status,
    active: activeRunIds.has(run.id),
    meta: runMeta(run),
  };
}

export function codexNodeData({
  activeRunIds,
  inputLabel,
  outputLabel,
  run,
  subtitle,
}: {
  activeRunIds: Set<string>;
  inputLabel: string;
  outputLabel: string;
  run: PipelineRunRecord | null;
  subtitle: string;
}): BlueprintNodeData {
  if (!run) {
    return {
      title: "Codex Transform",
      subtitle,
      detail: "Transforms selected extracted content into website-ready task or script drafts.",
      evidence: ["No Codex run has been recorded for this input yet."],
      inputs: [{ label: "active input bundle", detail: inputLabel }],
      outputs: [{ label: outputLabel, state: "missing" }],
      outputPreview: "Codex has not produced a draft for this lane yet.",
      problems: [{ label: "No Codex output", detail: "There is no final draft to validate or publish.", severity: "warning" }],
      stepKind: "transform",
      tone: "warning",
      status: "missing",
      meta: [{ label: "Input", value: inputLabel }],
    };
  }
  return {
    title: "Codex Transform",
    subtitle: `${run.engine} · ${run.configHash}`,
    detail: "Creates user-facing content from the selected input bundle. Removals, rewrites, and generated content must stay traceable.",
    artifacts: runArtifactSummary(run),
    config: runConfig(run),
    evidence: [`Run ${run.id}`, `Engine ${run.engine}`, `${run.artifactRefs?.length ?? 0} artifact refs`],
    inputs: [{ label: "active input bundle", detail: inputLabel }],
    outputs: [{ label: outputLabel, state: run.status }],
    outputPreview: runPreview(run),
    problems: runProblems(run),
    stepKind: "transform",
    tone: run.status === "failed" ? "warning" : "run",
    status: run.status,
    active: activeRunIds.has(run.id),
    meta: runMeta(run),
  };
}

export function finalOutputNodeData({
  sourceLabel,
  status,
  title,
  type,
  upstreamProblems,
}: {
  sourceLabel: string;
  status: string;
  title: string;
  type: "task" | "script";
  upstreamProblems: BlueprintProblem[];
}): BlueprintNodeData {
  const ready = status === "ok" || status === "succeeded";
  const problems = [
    ...upstreamProblems,
    ...(ready ? [] : [{ label: "Output not ready", detail: "The upstream Codex transform has not produced a validated website-ready output.", severity: "warning" as const }]),
  ];
  return {
    title,
    subtitle: type === "task" ? "website task output" : "website script output",
    detail: "Final output is only valid when it renders like website content and remains source-linked.",
    evidence: [`Source lane: ${sourceLabel}`, "Output must validate images, LaTeX, encoding, and source mapping."],
    inputs: [{ label: type === "task" ? "task draft" : "script draft", detail: sourceLabel }],
    outputs: [{ label: type === "task" ? "published task" : "published script section", state: ready ? "ready" : "needs_review" }],
    outputPreview: ready
      ? `${title} is ready to render in the course UI.`
      : `${title} is not ready. Inspect upstream nodes before trusting the website output.`,
    problems: problems.length > 0 ? problems : undefined,
    stepKind: "transform",
    tone: ready ? "output" : "warning",
    status: ready ? "ready" : "needs_review",
    meta: [
      { label: "Output type", value: type },
      { label: "Validation", value: ready ? "ready" : "needs review" },
    ],
  };
}

export function missingSolutionNode(group: CourseInventoryTaskGroup): BlueprintNodeData {
  return {
    title: "Solution PDF",
    subtitle: "missing",
    detail: "This task group has no paired solution input.",
    evidence: [group.pairingReason || "No matching solution PDF was found."],
    inputs: [{ label: "task group", detail: group.title }],
    outputs: [{ label: "solution pdf", state: "missing" }],
    outputPreview: "No solution file is available for this group.",
    problems: [{ label: "Solution missing", detail: "The collect step will continue with a missing solution input.", severity: "warning" }],
    stepKind: "transform",
    tone: "warning",
    status: group.pairingStatus,
    meta: [{ label: "Task group", value: group.title }],
  };
}

export function collectProblems(
  group: CourseInventoryTaskGroup,
  sheetRun: PipelineRunRecord | null,
  solutionRun: PipelineRunRecord | null,
): BlueprintProblem[] {
  const problems: BlueprintProblem[] = [];
  if (!sheetRun) {
    problems.push({ label: "Sheet extraction missing", detail: "The assignment sheet has no extraction output.", severity: "warning" });
  }
  if (!group.solution) {
    problems.push({ label: "Solution missing", detail: "No solution PDF was paired with this assignment sheet.", severity: "warning" });
  } else if (!solutionRun) {
    problems.push({ label: "Solution extraction missing", detail: "The solution PDF exists, but no extraction output is stored.", severity: "warning" });
  }
  return problems;
}

function runProblems(run: PipelineRunRecord): BlueprintProblem[] | undefined {
  const problems: BlueprintProblem[] = [];
  if (run.status === "failed") {
    problems.push({ label: "Run failed", detail: run.error || "The run failed without a stored error.", severity: "error" });
  }
  if ((run.artifactRefs?.length ?? 0) === 0) {
    problems.push({ label: "No artifacts", detail: "The run did not store any artifact references.", severity: "warning" });
  }
  return problems.length > 0 ? problems : undefined;
}
