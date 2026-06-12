"use client";

import { BookOpenText, CheckCircle2, Files, GitBranch, Sigma, Video } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StudyMode = "materials" | "tasks" | "script" | "formula" | "recordings" | "pipeline";

export function StudyModeActions({
  studyMode,
  layout = "grid",
  onMaterials,
  onTasks,
  onScript,
  onFormula,
  onRecordings,
  onPipeline,
}: {
  studyMode: StudyMode;
  layout?: "grid" | "main";
  onMaterials: () => void;
  onTasks: () => void;
  onScript: () => void;
  onFormula?: () => void;
  onRecordings: () => void;
  onPipeline?: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        layout === "main" ? "flex flex-col gap-1" : "grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-1",
      )}
    >
      <StudyModeButton
        active={studyMode === "materials"}
        icon={<Files aria-hidden />}
        label="Materialien"
        description="PDFs und Ressourcen"
        layout={layout}
        onClick={onMaterials}
      />
      <StudyModeButton
        active={studyMode === "tasks"}
        icon={<CheckCircle2 aria-hidden />}
        label="Alle Aufgaben"
        description="Aufgaben aus Blättern und Folien"
        layout={layout}
        onClick={onTasks}
      />
      <StudyModeButton
        active={studyMode === "script"}
        icon={<BookOpenText aria-hidden />}
        label="Script"
        description="KaTeX-fähiger Kurstext"
        layout={layout}
        onClick={onScript}
      />
      {onFormula ? (
        <StudyModeButton
          active={studyMode === "formula"}
          icon={<Sigma aria-hidden />}
          label="Formeln"
          description="Formelsammlung erstellen"
          layout={layout}
          onClick={onFormula}
        />
      ) : null}
      <StudyModeButton
        active={studyMode === "recordings"}
        icon={<Video aria-hidden />}
        label="Aufzeichnungen"
        description="Webex-Videos streamen"
        layout={layout}
        onClick={onRecordings}
      />
      {onPipeline ? (
        <StudyModeButton
          active={studyMode === "pipeline"}
          icon={<GitBranch aria-hidden />}
          label="Pipeline"
          description="Verarbeitung prüfen"
          layout={layout}
          onClick={onPipeline}
        />
      ) : null}
    </div>
  );
}

function StudyModeButton({
  active,
  icon,
  label,
  description,
  layout,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  layout: "grid" | "main";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg px-3 text-left transition-colors",
        layout === "main" ? "min-h-14 py-3" : "min-h-14 rounded-2xl py-2",
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground",
          active && "bg-primary-foreground/15 text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className={cn("block truncate text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {description}
        </span>
      </span>
    </button>
  );
}
