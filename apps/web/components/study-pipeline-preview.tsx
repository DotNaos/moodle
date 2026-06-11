"use client";

import { BookOpenText, CheckCircle2, FileText, Layers, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

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

type StudyPipelinePreviewProps = {
  course: Course;
  loading: boolean;
  mode: "tasks" | "script";
  runningStage: StudyPipelineStage | null;
  status: StudyPipelineStatusResponse | null;
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
  const sections = useMemo(() => buildStudyPipelinePreviewSections(status), [status]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const selectedCount = sections.filter((section) => selectedSectionIds.has(section.id)).length;

  function selectFirst(count: number) {
    setSelectedSectionIds(new Set(sections.slice(0, count).map((section) => section.id)));
  }

  function toggleSection(id: string) {
    setSelectedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="border-b border-border pb-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {mode === "script" ? <BookOpenText aria-hidden className="size-4" /> : <CheckCircle2 aria-hidden className="size-4" />}
            {mode === "script" ? "Script vorbereiten" : "Aufgaben vorbereiten"}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{courseTitle(course)}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Noch kein fertiger Study-Stand geladen. Prüfe zuerst die gefundenen Moodle-Ressourcen und starte dann bewusst
            die Erstellung.
          </p>
        </header>

        <PipelineSummary loading={loading} status={status} />

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-base font-semibold">Ressourcen-Vorschau</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Gruppiert nach Moodle-Abschnitten. Aufgabenblätter und Lösungen werden hervorgehoben.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={sections.length === 0}
                onClick={() => selectFirst(4)}
                type="button"
                variant="secondary"
              >
                Erste 4 Abschnitte markieren
              </Button>
              <Button
                disabled={sections.length === 0}
                onClick={() => setSelectedSectionIds(new Set(sections.map((section) => section.id)))}
                type="button"
                variant="secondary"
              >
                Alle markieren
              </Button>
            </div>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-[1.5rem] bg-secondary px-5 py-6 text-sm text-muted-foreground">
              {loading ? "Lade Moodle-Ressourcen..." : "Keine Ressourcen-Vorschau verfügbar."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sections.map((section) => (
                <button
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-[1.5rem] px-4 py-3 text-left transition-colors",
                    selectedSectionIds.has(section.id) ? "bg-primary text-primary-foreground" : "bg-secondary/70 hover:bg-secondary",
                  )}
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Layers aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{section.name}</span>
                    <span className="shrink-0 text-xs opacity-75">{section.items.length} Ressourcen</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {section.items.slice(0, 8).map((item) => (
                      <span
                        className={cn(
                          "inline-flex max-w-64 items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                          selectedSectionIds.has(section.id)
                            ? "bg-primary-foreground/15"
                            : item.kind === "task"
                              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                              : item.kind === "solution"
                                ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                                : "bg-background text-muted-foreground",
                        )}
                        key={item.id}
                      >
                        <FileText aria-hidden className="size-3 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </span>
                    ))}
                    {section.items.length > 8 ? (
                      <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        +{section.items.length - 8}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-border pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-base font-semibold">Erstellung starten</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Teilbereich-Erstellung ist im Backend noch nicht getrennt verfügbar. Die Markierung oben ist deshalb
                aktuell eine Vorschau für den nächsten Schritt; die Buttons unten starten die bestehenden Pipeline-Stufen.
              </p>
              {selectedCount > 0 ? (
                <p className="mt-2 text-sm text-foreground">{selectedCount} Abschnitt(e) markiert.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <StageButton
                label="Rohdaten holen"
                running={runningStage === "raw"}
                stage="raw"
                onRunStage={onRunStage}
              />
              <StageButton
                label="Texte extrahieren"
                running={runningStage === "extracted"}
                stage="extracted"
                onRunStage={onRunStage}
              />
              <StageButton
                label={mode === "script" ? "Script erstellen" : "Aufgaben erstellen"}
                primary
                running={runningStage === "curated"}
                stage="curated"
                onRunStage={onRunStage}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PipelineSummary({ loading, status }: { loading: boolean; status: StudyPipelineStatusResponse | null }) {
  const summary = status?.summary;
  const stageLabel = status?.stage ? stageText(status.stage) : "Noch nicht erstellt";
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryPill label="Stand" value={loading ? "Lädt..." : stageLabel} />
      <SummaryPill label="Ressourcen" value={String(summary?.totalResources ?? 0)} />
      <SummaryPill label="Aufgaben" value={String(summary?.tasks ?? 0)} />
      <SummaryPill label="Verknüpfte Lösungen" value={String(summary?.linkedSolutions ?? 0)} />
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-secondary px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function StageButton({
  label,
  onRunStage,
  primary = false,
  running,
  stage,
}: {
  label: string;
  onRunStage: (stage: StudyPipelineStage) => void;
  primary?: boolean;
  running: boolean;
  stage: StudyPipelineStage;
}) {
  return (
    <Button disabled={running} onClick={() => onRunStage(stage)} type="button" variant={primary ? "default" : "secondary"}>
      {running ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
      {label}
    </Button>
  );
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

function stageText(stage: string): string {
  if (stage === "curated") return "Script/Aufgaben erstellt";
  if (stage === "extracted") return "Texte extrahiert";
  if (stage === "raw") return "Rohdaten vorhanden";
  return stage;
}
