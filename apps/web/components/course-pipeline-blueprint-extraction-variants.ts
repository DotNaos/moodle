import type {
  BlueprintExtractionVariant,
  PipelineRunRecord,
} from "@/components/course-pipeline-blueprint-model";
import { resourceKeys } from "@/components/course-pipeline-blueprint-model";
import { runPreview } from "@/components/course-pipeline-blueprint-run-utils";
import type { RunLookup } from "@/components/course-pipeline-blueprint-lanes";

const EXTRACTION_ENGINES = ["pdftotext", "docling", "marker"] as const;
const EXTRACTION_STAGES = ["extracted", "extract_text", "extract_pages"] as const;

export function buildExtractionVariants({
  activeRunIds,
  resourceId,
  runLookup,
}: {
  activeRunIds: Set<string>;
  resourceId: string;
  runLookup: RunLookup;
}): BlueprintExtractionVariant[] {
  const runs = findResourceExtractionRuns(runLookup, resourceId);
  return EXTRACTION_ENGINES.map((engine) => {
    const engineRuns = runs
      .filter((run) => normalizedExtractionEngine(run.engine) === engine)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const latestRun = engineRuns[0] ?? null;
    const chars = latestRun ? runCharCount(latestRun) : null;
    const active = latestRun ? activeRunIds.has(latestRun.id) : false;
    return {
      active,
      artifactCount: latestRun?.artifactRefs?.length ?? 0,
      chars,
      configHash: latestRun?.configHash ?? `config:extracted:${engine}:default`,
      engine,
      preview: latestRun ? runPreview(latestRun) : "",
      runId: latestRun?.id,
      status: extractionVariantStatus(latestRun, active, chars),
    };
  });
}

function findResourceExtractionRuns(runLookup: RunLookup, resourceId: string): PipelineRunRecord[] {
  const runs = new Map<string, PipelineRunRecord>();
  for (const key of resourceKeys(resourceId)) {
    for (const stage of EXTRACTION_STAGES) {
      for (const run of runLookup.byResourceStage.get(`${key}:${stage}`) ?? []) {
        runs.set(run.id, run);
      }
    }
  }
  return [...runs.values()];
}

function extractionVariantStatus(
  run: PipelineRunRecord | null,
  active: boolean,
  chars: number | null,
): BlueprintExtractionVariant["status"] {
  if (!run) return "missing";
  if (run.status === "failed") return "failed";
  if (run.status === "stale") return "stale";
  if (chars !== null && chars < 80) return "weak";
  if (active) return "active";
  return "ok";
}

function normalizedExtractionEngine(engine: string): string {
  const normalized = engine.toLowerCase();
  if (normalized.includes("pdftotext") || normalized.includes("pdftoppm")) return "pdftotext";
  if (normalized.includes("marker")) return "marker";
  if (normalized.includes("docling")) return "docling";
  return normalized;
}

function runCharCount(run: PipelineRunRecord): number | null {
  for (const ref of run.artifactRefs ?? []) {
    const value = typeof ref.metadata?.chars === "number"
      ? ref.metadata.chars
      : typeof ref.metadata?.characters === "number"
        ? ref.metadata.characters
        : null;
    if (value !== null) return value;
  }
  return null;
}
