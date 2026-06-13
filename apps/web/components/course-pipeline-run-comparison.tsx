"use client";

import { AlertTriangle, CheckCircle2, GitCompareArrows, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineRunRecord, PipelineRunsResponse } from "@/components/course-pipeline-blueprint";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type RunComparisonProps = {
  onRerun: (engine: string) => void;
  onSelectRun: (runId: string) => void;
  rerunningEngine: string | null;
  runs: PipelineRunsResponse | null;
  selectingRunId: string | null;
};

export type RunComparisonModel = {
  active: boolean;
  chars: number | null;
  configHash: string;
  engine: string;
  latestRun: PipelineRunRecord | null;
  preview: string;
  status: "active" | "failed" | "missing" | "ok" | "stale" | "weak";
};

const OCR_ENGINES = [
  { id: "pdftotext", label: "pdftotext" },
  { id: "docling", label: "docling" },
  { id: "marker", label: "marker" },
] as const;

export function CoursePipelineRunComparison({
  onRerun,
  onSelectRun,
  rerunningEngine,
  runs,
  selectingRunId,
}: RunComparisonProps) {
  const models = buildRunComparisonModels(runs);
  const hasAnyRun = models.some((model) => model.latestRun);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-secondary/45 px-4 py-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitCompareArrows aria-hidden className="size-4 text-muted-foreground" />
            OCR / extraction comparison
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Compare extraction runs by engine, status, text volume, and active selection. Old runs stay available when a new engine is requested.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {OCR_ENGINES.map((engine) => (
            <Button
              disabled={Boolean(rerunningEngine)}
              key={engine.id}
              onClick={() => onRerun(engine.id)}
              type="button"
              variant="secondary"
            >
              {rerunningEngine === engine.id ? <Spinner aria-hidden /> : <RotateCcw aria-hidden />}
              Run {engine.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {models.map((model) => (
          <section className="rounded-3xl bg-secondary/45 px-4 py-4" key={model.engine}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{model.engine}</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">{model.configHash}</p>
              </div>
              <Badge variant={statusBadgeVariant(model.status)}>{model.status}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Chars" value={model.chars === null ? "unknown" : String(model.chars)} warning={model.status === "weak"} />
              <Metric label="Run" value={model.latestRun ? "stored" : "missing"} warning={!model.latestRun} />
            </div>

            <div className="mt-4 min-h-40 rounded-2xl bg-background/70 px-3 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
              <p className={cn("line-clamp-6 whitespace-pre-wrap text-sm leading-6", model.preview ? "text-foreground" : "text-muted-foreground")}>
                {model.preview || "No preview artifact recorded for this run yet."}
              </p>
            </div>

            {model.latestRun ? (
              <div className="mt-4 grid gap-2">
                <p className="truncate text-[11px] text-muted-foreground">{model.latestRun.id}</p>
                {model.latestRun.error ? (
                  <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{model.latestRun.error}</p>
                ) : null}
                <Button
                  disabled={model.active || selectingRunId === model.latestRun.id}
                  onClick={() => onSelectRun(model.latestRun?.id ?? "")}
                  type="button"
                  variant={model.active ? "default" : "secondary"}
                >
                  {selectingRunId === model.latestRun.id ? <Spinner aria-hidden /> : model.active ? <CheckCircle2 aria-hidden /> : <RotateCcw aria-hidden />}
                  {model.active ? "Active" : "Set active"}
                </Button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {!hasAnyRun ? (
        <div className="flex items-start gap-2 rounded-3xl bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Run an extraction engine first. The comparison keeps separate immutable runs once they exist.
        </div>
      ) : null}
    </div>
  );
}

export function buildRunComparisonModels(runs: PipelineRunsResponse | null): RunComparisonModel[] {
  const activeRunIds = new Set((runs?.activeSelections ?? [])
    .filter((selection) => selection.stage === "extracted")
    .map((selection) => selection.activeRunId));
  const extractedRuns = (runs?.runs ?? []).filter((run) => run.stage === "extracted");
  return OCR_ENGINES.map((engine) => {
    const engineRuns = extractedRuns
      .filter((run) => normalizedEngine(run.engine) === engine.id)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const latestRun = engineRuns[0] ?? null;
    const chars = latestRun ? runCharCount(latestRun) : null;
    const active = latestRun ? activeRunIds.has(latestRun.id) : false;
    return {
      active,
      chars,
      configHash: latestRun?.configHash ?? `config:extracted:${engine.id}:default`,
      engine: engine.label,
      latestRun,
      preview: latestRun ? runPreview(latestRun) : "",
      status: runComparisonStatus(latestRun, active, chars),
    };
  });
}

function runComparisonStatus(run: PipelineRunRecord | null, active: boolean, chars: number | null): RunComparisonModel["status"] {
  if (!run) return "missing";
  if (run.status === "failed") return "failed";
  if (run.status === "stale") return "stale";
  if (chars !== null && chars < 80) return "weak";
  if (active) return "active";
  return "ok";
}

function normalizedEngine(engine: string) {
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

function runPreview(run: PipelineRunRecord): string {
  for (const ref of run.artifactRefs ?? []) {
    if (typeof ref.metadata?.preview === "string") return ref.metadata.preview;
    if (typeof ref.metadata?.textPreview === "string") return ref.metadata.textPreview;
  }
  if (run.error) return run.error;
  return `${run.engine} run ${run.status}. Artifact root: ${run.artifactRoot || "none"}`;
}

function statusBadgeVariant(status: RunComparisonModel["status"]) {
  if (status === "failed" || status === "weak") return "destructive";
  if (status === "active") return "default";
  return "secondary";
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-background/70 px-3 py-2", warning && "bg-destructive/10 text-destructive")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
