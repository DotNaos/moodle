import type { PipelineRunRecord } from "@/components/course-pipeline-blueprint-model";

export const STAGE_LABELS: Record<string, string> = {
  inventory: "Inventory",
  raw: "Raw import",
  extracted: "Extracted",
  curated: "Codex curated",
  extract_text: "Text extraction",
  codex_curate: "Codex transform",
};

export function runPreview(run: PipelineRunRecord): string {
  for (const ref of run.artifactRefs ?? []) {
    if (typeof ref.metadata?.preview === "string" && ref.metadata.preview) return ref.metadata.preview;
    if (typeof ref.metadata?.textPreview === "string" && ref.metadata.textPreview) return ref.metadata.textPreview;
  }
  if (run.error) return run.error;
  return `${run.stage} ${run.status}\nEngine: ${run.engine}\nArtifact root: ${run.artifactRoot || "none"}`;
}

export function runArtifactSummary(run: PipelineRunRecord): string[] {
  return (run.artifactRefs ?? []).slice(0, 12).map((ref) => {
    const parts = [
      ref.kind,
      ref.pageNumber ? `page ${ref.pageNumber}` : "",
      ref.blockId ? `block ${ref.blockId}` : "",
      ref.storageKey || ref.uri || "",
      ref.checksum ? `checksum ${shortValue(ref.checksum)}` : "",
    ].filter(Boolean);
    return `${ref.id}: ${parts.join(" · ")}`;
  });
}

export function runConfig(run: PipelineRunRecord): Array<{ label: string; value: string }> {
  return [
    { label: "Engine", value: run.engine },
    { label: "Config", value: run.configHash },
    { label: "Ownership", value: run.ownership },
  ];
}

export function runMeta(run: PipelineRunRecord): Array<{ label: string; value: string }> {
  return [
    { label: "Run ID", value: run.id },
    { label: "Engine", value: run.engine },
    { label: "Ownership", value: run.ownership },
    { label: "Artifact root", value: run.artifactRoot || "none" },
  ];
}

export function stableId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function formatDateTime(value: string): string {
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

function shortValue(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value;
}
