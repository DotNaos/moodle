"use client";

import { AlertTriangle, CheckCircle2, FileText, GitCompareArrows, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

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
  artifactCount: number;
  artifactSummary: string[];
  chars: number | null;
  configHash: string;
  engine: string;
  latestRun: PipelineRunRecord | null;
  metadata: Array<{ label: string; value: string }>;
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
  const [selectedEngine, setSelectedEngine] = useState(models.find((model) => model.latestRun)?.engine ?? models[0]?.engine ?? "");
  const selectedModel = useMemo(
    () => models.find((model) => model.engine === selectedEngine) ?? models.find((model) => model.latestRun) ?? models[0],
    [models, selectedEngine],
  );
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

      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid gap-2">
          {models.map((model) => {
            const selected = selectedModel?.engine === model.engine;
            return (
              <button
                className={cn(
                  "rounded-3xl bg-secondary/45 px-4 py-4 text-left transition-colors hover:bg-secondary",
                  selected && "bg-primary text-primary-foreground hover:bg-primary",
                )}
                key={model.engine}
                onClick={() => setSelectedEngine(model.engine)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={cn("truncate text-base font-semibold text-foreground", selected && "text-primary-foreground")}>
                      {model.engine}
                    </h2>
                    <p className={cn("mt-1 truncate text-xs text-muted-foreground", selected && "text-primary-foreground/70")}>
                      {model.configHash}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(model.status)}>{model.status}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="Chars" value={model.chars === null ? "unknown" : String(model.chars)} warning={model.status === "weak"} />
                  <Metric label="Artifacts" value={String(model.artifactCount)} warning={model.latestRun !== null && model.artifactCount === 0} />
                </div>
              </button>
            );
          })}
              </div>

        <RunOutputInspector
          model={selectedModel}
          onSelectRun={onSelectRun}
          selectingRunId={selectingRunId}
        />
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

function RunOutputInspector({
  model,
  onSelectRun,
  selectingRunId,
}: {
  model?: RunComparisonModel;
  onSelectRun: (runId: string) => void;
  selectingRunId: string | null;
}) {
  if (!model) {
    return null;
  }
  const run = model.latestRun;
  return (
    <section className="min-h-[460px] rounded-3xl bg-secondary/45 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText aria-hidden className="size-4 text-muted-foreground" />
            {model.engine} output
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{run?.id ?? "No run stored yet"}</p>
        </div>
        <Badge variant={statusBadgeVariant(model.status)}>{model.status}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Text chars" value={model.chars === null ? "unknown" : String(model.chars)} warning={model.status === "weak"} />
        <Metric label="Artifacts" value={String(model.artifactCount)} warning={run !== null && model.artifactCount === 0} />
        <Metric label="Run state" value={run?.status ?? "missing"} warning={!run || run.status === "failed"} />
      </div>

      <div className="mt-4 rounded-2xl bg-background/70 px-3 py-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Extracted output preview</p>
        <p className={cn("max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6", model.preview ? "text-foreground" : "text-muted-foreground")}>
          {model.preview || "This run has no text preview stored. The artifact list below shows what the pipeline did persist."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl bg-background/70 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Artifacts</p>
          {model.artifactSummary.length > 0 ? (
            <div className="grid gap-2">
              {model.artifactSummary.map((artifact) => (
                <p className="break-words rounded-2xl bg-secondary/60 px-3 py-2 text-xs leading-5 text-foreground" key={artifact}>
                  {artifact}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">No artifact references were recorded for this run.</p>
          )}
        </div>

        <div className="rounded-2xl bg-background/70 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Run metadata</p>
          <div className="grid gap-2">
            {model.metadata.map((item) => (
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-xs" key={item.label}>
                <span className="text-muted-foreground">{item.label}</span>
                <span className="break-words font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {run ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {run.error ? (
            <p className="min-w-full rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{run.error}</p>
          ) : null}
          <Button
            disabled={model.active || selectingRunId === run.id}
            onClick={() => onSelectRun(run.id)}
            type="button"
            variant={model.active ? "default" : "secondary"}
          >
            {selectingRunId === run.id ? <Spinner aria-hidden /> : model.active ? <CheckCircle2 aria-hidden /> : <RotateCcw aria-hidden />}
            {model.active ? "Active output" : "Use this output"}
          </Button>
        </div>
      ) : null}
    </section>
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
      artifactCount: latestRun?.artifactRefs?.length ?? 0,
      artifactSummary: latestRun ? runArtifactSummary(latestRun) : [],
      chars,
      configHash: latestRun?.configHash ?? `config:extracted:${engine.id}:default`,
      engine: engine.label,
      latestRun,
      metadata: runMetadata(latestRun),
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

function runArtifactSummary(run: PipelineRunRecord): string[] {
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

function runMetadata(run: PipelineRunRecord | null): Array<{ label: string; value: string }> {
  if (!run) return [{ label: "State", value: "No run stored for this engine." }];
  return [
    { label: "Engine", value: run.engine },
    { label: "Config", value: run.configHash },
    { label: "Created", value: formatDateTime(run.createdAt) },
    { label: "Root", value: run.artifactRoot || "none" },
    { label: "Owner", value: run.ownership },
  ];
}

function shortValue(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "unknown";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
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
