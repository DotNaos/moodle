"use client";

import { CheckCircle2, Circle, ExternalLink, Loader2, Play, XCircle } from "lucide-react";

import type { BlueprintRunScope } from "@/components/course-pipeline-blueprint-model";
import type { StudyPipelineStatusResponse } from "@/components/study-pipeline-preview";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CodexModelOption } from "@/hooks/use-codex-models";
import type { CodexDeviceCode } from "@/lib/codex-auth-client";

export type PipelineStageId = "inventory" | "raw" | "extracted" | "curated";
export type PipelineRunMode = "single" | "from";
export type PipelineScopeMode = "course" | "selected";
type PipelineStepState = "failed" | "queued" | "running" | "succeeded";

export type PipelineCodexSettings = {
  model?: string;
  reasoningEffort?: string;
};

export type PipelinePlanStep = {
  detail?: string;
  id: string;
  label: string;
  state: PipelineStepState;
  stage: PipelineStageId;
};

export type PipelinePlanResponse = {
  courseId: string;
  response?: StudyPipelineStatusResponse;
  status: "failed" | "succeeded" | string;
  steps: Array<{
    error?: string;
    run?: {
      error?: string;
      status?: string;
    };
    stage: PipelineStageId;
    status: PipelineStepState | string;
  }>;
};

export const PIPELINE_STAGES: Array<{ id: PipelineStageId; label: string }> = [
  { id: "inventory", label: "Inventory" },
  { id: "raw", label: "Raw import" },
  { id: "extracted", label: "Extraction" },
  { id: "curated", label: "Codex" },
];

export function PipelineRunControl({
  disabled,
  codexModel,
  codexModelOptions,
  codexConnected,
  codexConnecting,
  codexDeviceCode,
  codexError,
  codexModelsLoading,
  mode,
  onCodexConnect,
  onModeChange,
  onCodexModelChange,
  onRun,
  onScopeModeChange,
  onStartStageChange,
  plan,
  scopeMode,
  selectedScope,
  startStage,
}: {
  disabled: boolean;
  codexModel: string;
  codexModelOptions: CodexModelOption[];
  codexConnected: boolean;
  codexConnecting: boolean;
  codexDeviceCode: CodexDeviceCode | null;
  codexError: string | null;
  codexModelsLoading: boolean;
  mode: PipelineRunMode;
  onCodexConnect: () => void;
  onModeChange: (mode: PipelineRunMode) => void;
  onCodexModelChange: (model: string) => void;
  onRun: () => void;
  onScopeModeChange: (mode: PipelineScopeMode) => void;
  onStartStageChange: (stage: PipelineStageId) => void;
  plan: PipelinePlanStep[];
  scopeMode: PipelineScopeMode;
  selectedScope: BlueprintRunScope | null;
  startStage: PipelineStageId;
}) {
  const effectiveScope = resolveRunScope({ mode: scopeMode, selectedScope });
  const running = plan.some((step) => step.state === "running");
  const completed = plan.filter((step) => step.state === "succeeded").length;
  const percent = plan.length === 0 ? 0 : Math.round((completed / plan.length) * 100);
  const canUseSelection = Boolean(selectedScope && selectedScope.kind !== "course");
  const runLabel = mode === "single" ? "Schritt starten" : "Ab hier starten";
  const scopeLabel = effectiveScope.kind === "course" ? "Ganzer Kurs" : effectiveScope.label;
  const includesCodex = stagesForPlan(mode, startStage).some((stage) => stage.id === "curated");
  const codexModelReady = !includesCodex || (codexConnected && Boolean(codexModel));
  const codexRunBlocked = includesCodex && !codexModelReady;
  const modelOptions = codexModelOptions.length > 0
    ? codexModelOptions.map((model) => ({ label: model.label || model.id, value: model.id }))
    : [{ label: codexModelsLoading ? "Modelle laden" : "Default Codex", value: "" }];

  return (
    <section className="rounded-3xl bg-secondary/45 p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineSelect
            disabled={disabled}
            label="Modus"
            onChange={(value) => onModeChange(value as PipelineRunMode)}
            options={[
              { label: "Ab Schritt", value: "from" },
              { label: "Nur Schritt", value: "single" },
            ]}
            value={mode}
          />
          <PipelineSelect
            disabled={disabled}
            label="Start"
            onChange={(value) => onStartStageChange(value as PipelineStageId)}
            options={PIPELINE_STAGES.map((stage) => ({ label: stage.label, value: stage.id }))}
            value={startStage}
          />
          <PipelineSelect
            disabled={disabled}
            label="Scope"
            onChange={(value) => onScopeModeChange(value as PipelineScopeMode)}
            options={[
              { label: "Ganzer Kurs", value: "course" },
              { disabled: !canUseSelection, label: "Auswahl", value: "selected" },
            ]}
            value={scopeMode === "selected" && canUseSelection ? "selected" : "course"}
          />
          {includesCodex ? (
            <PipelineSelect
              disabled={disabled || codexModelsLoading}
              label="Codex Modell"
              onChange={onCodexModelChange}
              options={modelOptions}
              value={codexModelOptions.some((model) => model.id === codexModel) ? codexModel : ""}
            />
          ) : null}
        </div>

        <Button className="h-11 w-full rounded-full px-4 lg:w-fit" disabled={disabled || codexRunBlocked} onClick={onRun} type="button">
          {running ? <Spinner aria-hidden /> : <Play aria-hidden />}
          {runLabel}
        </Button>
      </div>

      {includesCodex && !codexModelReady ? (
        <div className="mt-3 rounded-3xl bg-background/70 px-3 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">ChatGPT verbinden</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Codex kann erst laufen, wenn diese Session verbunden ist und ein Modell geladen wurde.
              </p>
              {codexError ? <p className="mt-1 text-xs text-destructive">{codexError}</p> : null}
            </div>
            <Button className="w-full rounded-full sm:w-fit" disabled={disabled || codexConnecting || codexModelsLoading} onClick={onCodexConnect} type="button">
              {codexConnecting || codexModelsLoading ? <Spinner aria-hidden /> : null}
              {codexConnecting ? "Warte auf Login" : "ChatGPT verbinden"}
            </Button>
          </div>
          {codexDeviceCode ? (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-secondary/70 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Code eingeben</p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-foreground">{codexDeviceCode.userCode}</p>
              </div>
              <Button asChild className="w-full rounded-full sm:w-fit" type="button" variant="secondary">
                <a href={codexDeviceCode.verificationUri} rel="noreferrer" target="_blank">
                  Öffnen
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 truncate text-xs text-muted-foreground">
        {running ? "Server-Run läuft. Seite kann geschlossen werden. " : ""}
        Scope: <span className="font-medium text-foreground">{scopeLabel}</span>
        {effectiveScope.resourceIds.length > 0 ? ` · ${effectiveScope.resourceIds.length} resource${effectiveScope.resourceIds.length === 1 ? "" : "s"}` : ""}
      </p>

      {plan.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{running ? "Pipeline läuft" : percent === 100 ? "Pipeline fertig" : "Pipeline bereit"}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {plan.map((step) => (
              <PipelinePlanStepTile key={step.id} step={step} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function resolveRunScope({
  mode,
  selectedScope,
}: {
  mode: PipelineScopeMode;
  selectedScope: BlueprintRunScope | null;
}): BlueprintRunScope {
  if (mode === "selected" && selectedScope) return selectedScope;
  return { kind: "course", label: "Whole course", resourceIds: [] };
}

export function stagesForPlan(mode: PipelineRunMode, startStage: PipelineStageId) {
  const startIndex = PIPELINE_STAGES.findIndex((stage) => stage.id === startStage);
  if (mode === "single") return PIPELINE_STAGES.filter((stage) => stage.id === startStage);
  return PIPELINE_STAGES.slice(Math.max(0, startIndex));
}

export function planRequestBody(mode: PipelineRunMode, startStage: PipelineStageId, scope: BlueprintRunScope, codex?: PipelineCodexSettings) {
  const includesCodex = stagesForPlan(mode, startStage).some((stage) => stage.id === "curated");
  return {
    ...stageRequestBody(startStage, scope),
    ...(includesCodex && codex?.model ? { model: codex.model } : {}),
    ...(includesCodex && codex?.reasoningEffort ? { reasoningEffort: codex.reasoningEffort } : {}),
    mode,
    startStage,
  };
}

export function planStepsFromResponse(
  runId: string,
  expectedStages: Array<{ id: PipelineStageId; label: string }>,
  responseSteps: PipelinePlanResponse["steps"],
): PipelinePlanStep[] {
  const labels = new Map(PIPELINE_STAGES.map((stage) => [stage.id, stage.label]));
  const expectedIds = new Set(expectedStages.map((stage) => stage.id));
  const normalized = responseSteps
    .filter((step) => expectedIds.has(step.stage))
    .map((step) => ({
      detail: step.error ?? (step.run?.status === "failed" ? step.run.error : undefined),
      id: `${runId}:${step.stage}`,
      label: labels.get(step.stage) ?? step.stage,
      state: step.run?.status === "failed" ? "failed" : normalizePlanStepState(step.status),
      stage: step.stage,
    }));
  return normalized.length > 0
    ? normalized
    : expectedStages.map((stage) => ({
      id: `${runId}:${stage.id}`,
      label: stage.label,
      state: "queued",
      stage: stage.id,
    }));
}

export function markPlanStep(plan: PipelinePlanStep[], stage: PipelineStageId, state: PipelineStepState): PipelinePlanStep[] {
  return plan.map((step) => step.stage === stage ? { ...step, detail: undefined, state } : step);
}

export function markRunningPlanStepFailed(plan: PipelinePlanStep[], detail: string): PipelinePlanStep[] {
  let marked = false;
  return plan.map((step) => {
    if (!marked && step.state === "running") {
      marked = true;
      return { ...step, detail, state: "failed" };
    }
    return step;
  });
}

export function markRunningPlanStepWaitingForStatus(plan: PipelinePlanStep[], detail: string): PipelinePlanStep[] {
  let marked = false;
  return plan.map((step) => {
    if (!marked && step.state === "running") {
      marked = true;
      return { ...step, detail, state: "running" };
    }
    return step;
  });
}

function PipelineSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ disabled?: boolean; label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="px-1 text-xs font-medium text-muted-foreground">{label}</span>
      <select
        className="h-11 min-w-0 rounded-full bg-background px-4 text-sm font-semibold text-foreground outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PipelinePlanStepTile({ step }: { step: PipelinePlanStep }) {
  const Icon = step.state === "succeeded"
    ? CheckCircle2
    : step.state === "failed"
      ? XCircle
      : step.state === "running"
        ? Loader2
        : Circle;
  return (
    <div className="rounded-2xl bg-background/70 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden className={`size-4 ${step.state === "running" ? "animate-spin" : ""}`} />
        {step.label}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{step.detail ?? stepStateLabel(step.state)}</p>
    </div>
  );
}

function stageRequestBody(stage: PipelineStageId, scope: BlueprintRunScope) {
  return {
    ...(stage === "extracted" ? { configHash: "config:extracted:pdftotext:default", engine: "pdftotext" } : {}),
    ...(scope.resourceIds.length > 0 ? { resourceIds: scope.resourceIds } : {}),
  };
}

function normalizePlanStepState(state: string): PipelineStepState {
  switch (state) {
    case "failed":
    case "queued":
    case "running":
    case "succeeded":
      return state;
    default:
      return "queued";
  }
}

function stepStateLabel(state: PipelineStepState): string {
  switch (state) {
    case "failed":
      return "failed";
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "done";
  }
}
