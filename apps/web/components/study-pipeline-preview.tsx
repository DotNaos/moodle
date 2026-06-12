"use client";

import { BookOpenText, CheckCircle2, Loader2, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ExtractedDocumentsResponse } from "@/components/extracted-document-inspector";
import type { Course } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";

export type StudyPipelineStage = "raw" | "extracted" | "curated";

export type StudyPipelineStatusResponse = {
  courseId: string;
  status: string;
  stage?: string;
  createdAt: string;
  summary: {
    totalResources: number;
    slides: number;
    scripts: number;
    tasks: number;
    solutions: number;
    other: number;
    linkedSolutions: number;
    missingSolutions: number;
  };
  materials: StudyPipelineMaterial[];
  taskLinks: StudyPipelineTaskLink[];
  missingSolutions: StudyPipelineMaterial[];
};

export type StudyPipelineMaterial = {
  id: string;
  name: string;
  type: string;
  resourceType?: string;
  fileType?: string;
  sectionId?: string;
  sectionName?: string;
};

type StudyPipelineTaskLink = {
  task: StudyPipelineMaterial;
  solution?: StudyPipelineMaterial;
  status: string;
};

export type CourseInventoryResponse = {
  courseId: string;
  generatedAt: string;
  artifactRoot?: string;
  summary: {
    totalResources: number;
    lectureMaterial: number;
    taskGroups: number;
    pairedTaskGroups: number;
    missingSolutionGroups: number;
    ambiguousTaskGroups: number;
    references: number;
    interactions: number;
    ignoredAllowed?: number;
    unknown: number;
  };
  lectureMaterial: CourseInventoryNode[];
  taskGroups: CourseInventoryTaskGroup[];
  references: CourseInventoryNode[];
  interactions: CourseInventoryNode[];
  ignoredAllowed?: CourseInventoryNode[];
  unknown: CourseInventoryNode[];
};

export type CourseInventoryNode = {
  id: string;
  name: string;
  url?: string;
  type: string;
  resourceType?: string;
  fileType?: string;
  sectionId?: string;
  sectionName?: string;
  bucket: string;
  role: string;
  reason: string;
  confidence: string;
};

export type CourseInventoryTaskGroup = {
  id: string;
  title: string;
  sheet: CourseInventoryNode;
  solution?: CourseInventoryNode;
  solutionCandidates?: CourseInventoryNode[];
  pairingStatus: "paired" | "missing_solution" | "ambiguous_solution" | string;
  pairingReason: string;
  pairingConfidence: string;
};

type StudyPipelinePreviewProps = {
  course: Course;
  extractedDocuments: ExtractedDocumentsResponse | null;
  extractedError: string | null;
  extractedLoading: boolean;
  inventory: CourseInventoryResponse | null;
  inventoryError: string | null;
  inventoryLoading: boolean;
  loading: boolean;
  mode: "tasks" | "script";
  runningStage: StudyPipelineStage | null;
  status: StudyPipelineStatusResponse | null;
  onLoadExtractedDocuments: () => void;
  onRefreshInventory: () => void;
  onRunStage: (stage: StudyPipelineStage) => void;
};

export function StudyPipelinePreview({
  course,
  loading,
  mode,
  runningStage,
  status,
  onRunStage,
}: StudyPipelinePreviewProps) {
  const summary = status?.summary;
  const busy = loading || Boolean(runningStage);
  const progress = useMemo(
    () => pipelineRequestProgress({ loading, mode, runningStage, status }),
    [loading, mode, runningStage, status],
  );
  const courseId = String(course.id);
  const pipelineHref = `/courses/${encodeURIComponent(courseId)}/pipeline`;
  const chatHref = `/chat?course=${encodeURIComponent(courseId)}`;
  const requestLabel = mode === "script" ? "Script anfordern" : "Aufgaben anfordern";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 md:px-6 md:py-14">
        <header className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
            {mode === "script" ? (
              <BookOpenText aria-hidden className="size-6" />
            ) : (
              <CheckCircle2 aria-hidden className="size-6" />
            )}
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            {mode === "script" ? "Noch kein Script erstellt" : "Noch keine Aufgaben erstellt"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {loading
              ? "Moodle-Ressourcen werden geprüft…"
              : mode === "script"
                ? `Aus den Materialien von ${courseTitle(course)} wird ein durchsuchbares Script mit Quellenverweisen erstellt.`
                : `Aus den Aufgabenblättern von ${courseTitle(course)} werden prüfbare Aufgaben mit Lösungs-Check erstellt.`}
          </p>
          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row">
            <StageButton
              disabled={busy}
              label={runningStage ? "Wird erstellt" : requestLabel}
              primary
              running={runningStage === "curated"}
              stage="curated"
              onRunStage={onRunStage}
            />
            <Button asChild variant="secondary">
              <a href={chatHref}>
                <MessageCircle aria-hidden />
                Problem melden
              </a>
            </Button>
          </div>
        </header>

        {summary ? (
          <div className="flex flex-wrap justify-center gap-2">
            <StatChip label="Ressourcen" value={summary.totalResources} />
            <StatChip label="Aufgabenblätter" value={summary.tasks} />
            <StatChip label="Lösungen verknüpft" value={summary.linkedSolutions} />
          </div>
        ) : null}

        <section className="rounded-3xl bg-secondary/40 px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{progress.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{progress.description}</p>
              </div>
              <Button asChild className="w-fit" variant="secondary">
                <a href={pipelineHref}>
                  <RefreshCw aria-hidden />
                  Status anschauen
                </a>
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{progress.stepLabel}</span>
                <span className="tabular-nums">{progress.percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            {runningStage ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner aria-hidden className="size-3.5" />
                Die Erstellung läuft im Hintergrund. Du kannst die Seite geöffnet lassen oder später zurückkommen.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs">
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function StageButton({
  disabled = false,
  label,
  onRunStage,
  primary = false,
  running,
  stage,
}: {
  disabled?: boolean;
  label: string;
  onRunStage: (stage: StudyPipelineStage) => void;
  primary?: boolean;
  running: boolean;
  stage: StudyPipelineStage;
}) {
  return (
    <Button
      disabled={disabled || running}
      onClick={() => onRunStage(stage)}
      type="button"
      variant={primary ? "default" : "secondary"}
    >
      {running ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
      {label}
    </Button>
  );
}

function pipelineRequestProgress({
  loading,
  mode,
  runningStage,
  status,
}: {
  loading: boolean;
  mode: "tasks" | "script";
  runningStage: StudyPipelineStage | null;
  status: StudyPipelineStatusResponse | null;
}) {
  const outputName = mode === "script" ? "Script" : "Aufgaben";
  if (runningStage) {
    const stage = stageProgress(runningStage);
    return {
      percent: stage.percent,
      stepLabel: stage.label,
      title: `${outputName} werden erstellt`,
      description: "Die Verarbeitung läuft im Hintergrund mit den Standard-Einstellungen.",
    };
  }
  if (loading) {
    return {
      percent: 12,
      stepLabel: "Status wird geprüft",
      title: "Pipeline wird geprüft",
      description: "Die App sucht nach bestehenden Läufen und Ergebnissen.",
    };
  }
  if (!status) {
    return {
      percent: 0,
      stepLabel: "Noch nicht gestartet",
      title: `${outputName} noch nicht angefordert`,
      description: "Starte die Verarbeitung mit den Standard-Einstellungen. Details bleiben im Pipeline-Inspector.",
    };
  }

  const stage = stageProgress(status.stage);
  const ready = status.stage === "curated";
  return {
    percent: stage.percent,
    stepLabel: stage.label,
    title: ready ? `${outputName} bereit` : `${outputName} in Vorbereitung`,
    description: ready
      ? "Die Pipeline hat einen fertigen Stand gemeldet. Lade die Ansicht erneut, falls sie noch nicht sichtbar ist."
      : "Die Pipeline hat bereits einen Zwischenstand. Du kannst den aktuellen Stand im Inspector prüfen.",
  };
}

function stageProgress(stage?: string | null) {
  switch (stage) {
    case "raw":
      return { percent: 25, label: "Rohdaten geladen" };
    case "inventory":
      return { percent: 35, label: "Ressourcen klassifiziert" };
    case "extracted":
      return { percent: 65, label: "Texte extrahiert" };
    case "curated":
      return { percent: 100, label: "Ergebnis bereit" };
    default:
      return { percent: 8, label: "Wartet auf Start" };
  }
}

export function buildStudyPipelinePreviewSections(status: StudyPipelineStatusResponse | null) {
  const sections = new Map<string, { id: string; name: string; items: Array<{ id: string; kind: string; name: string }> }>();
  for (const material of status?.materials ?? []) {
    const id = material.sectionId || material.sectionName || "general";
    if (!sections.has(id)) {
      sections.set(id, { id, name: material.sectionName || "Allgemein", items: [] });
    }
    sections.get(id)?.items.push({
      id: material.id,
      kind: material.type,
      name: material.name,
    });
  }
  for (const link of status?.taskLinks ?? []) {
    markKind(sections, link.task.id, "task");
    if (link.solution?.id) {
      markKind(sections, link.solution.id, "solution");
    }
  }
  return [...sections.values()];
}

type InventorySection = {
  id: string;
  label: string;
  items: CourseInventoryNode[];
};

export function buildInventorySections(inventory: CourseInventoryResponse | null) {
  if (!inventory) {
    return [];
  }
  const assignmentSheets = inventory.taskGroups.map((group) => group.sheet);
  const solutions = uniqueInventoryNodes(
    inventory.taskGroups.flatMap((group) => [
      ...(group.solution ? [group.solution] : []),
      ...(group.solutionCandidates ?? []),
    ]),
  );
  return [
    { id: "lecture", label: "Vorlesungsmaterial", items: inventory.lectureMaterial },
    { id: "assignments", label: "Aufgabenblätter", items: assignmentSheets },
    { id: "solutions", label: "Lösungen", items: solutions },
    { id: "references", label: "Referenzen", items: inventory.references },
    { id: "interactions", label: "Interaktionen", items: inventory.interactions },
    { id: "ignored", label: "Ignoriert", items: inventory.ignoredAllowed ?? [] },
    { id: "unknown", label: "Unbekannt", items: inventory.unknown },
  ].filter((section) => section.items.length > 0);
}

function uniqueInventoryNodes(nodes: CourseInventoryNode[]): CourseInventoryNode[] {
  const seen = new Set<string>();
  const unique: CourseInventoryNode[] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) {
      continue;
    }
    seen.add(node.id);
    unique.push(node);
  }
  return unique;
}

function markKind(
  sections: Map<string, { id: string; name: string; items: Array<{ id: string; kind: string; name: string }> }>,
  id: string,
  kind: string,
) {
  for (const section of sections.values()) {
    const item = section.items.find((candidate) => candidate.id === id);
    if (item) {
      item.kind = kind;
      return;
    }
  }
}
