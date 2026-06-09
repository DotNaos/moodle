"use client";

import { BookOpenText, CheckCircle2, Files, Sigma, Video } from "lucide-react";
import type { ComponentType } from "react";

import type { StudyMode } from "@/components/study-mode-actions";
import { cn } from "@/lib/utils";

type CourseSidebarMode = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  mode: StudyMode;
};

const COURSE_SIDEBAR_MODES: CourseSidebarMode[] = [
  { mode: "materials", icon: Files, label: "Materialien" },
  { mode: "tasks", icon: CheckCircle2, label: "Aufgaben" },
  { mode: "script", icon: BookOpenText, label: "Script" },
  { mode: "formula", icon: Sigma, label: "Formeln" },
  { mode: "recordings", icon: Video, label: "Videos" },
];

export function CourseSidebar({
  courseHubOpen,
  sidebarCollapsed,
  studyMode,
  onFormula,
  onMaterials,
  onRecordings,
  onScript,
  onTasks,
}: {
  courseHubOpen: boolean;
  sidebarCollapsed: boolean;
  studyMode: StudyMode;
  onFormula: () => void;
  onMaterials: () => void;
  onRecordings: () => void;
  onScript: () => void;
  onTasks: () => void;
}) {
  const handlers: Record<StudyMode, () => void> = {
    materials: onMaterials,
    tasks: onTasks,
    script: onScript,
    formula: onFormula,
    recordings: onRecordings,
  };

  return (
    <aside className="hidden min-h-0 w-full min-w-0 flex-col md:flex md:h-full md:max-h-none md:overflow-hidden md:rounded-none md:border-r md:border-border md:bg-background md:shadow-none">
      <CourseSidebarRail
        courseHubOpen={courseHubOpen}
        handlers={handlers}
        hidden={!sidebarCollapsed}
        studyMode={studyMode}
      />
      <div className={cn("min-h-0 flex-1 flex-col gap-1.5 px-3 py-4", sidebarCollapsed ? "md:hidden" : "flex")}>
        {COURSE_SIDEBAR_MODES.map(({ icon, label, mode }) => (
          <CourseSidebarButton
            key={mode}
            active={!courseHubOpen && studyMode === mode}
            icon={icon}
            label={label}
            onClick={handlers[mode]}
          />
        ))}
      </div>
    </aside>
  );
}

function CourseSidebarRail({
  courseHubOpen,
  handlers,
  hidden,
  studyMode,
}: {
  courseHubOpen: boolean;
  handlers: Record<StudyMode, () => void>;
  hidden: boolean;
  studyMode: StudyMode;
}) {
  return (
    <div className={cn("hidden h-full w-full flex-col gap-1.5 overflow-y-auto px-2 py-4", !hidden && "md:flex")}>
      {COURSE_SIDEBAR_MODES.map(({ icon, label, mode }) => (
        <CourseSidebarRailItem
          key={mode}
          active={!courseHubOpen && studyMode === mode}
          icon={icon}
          label={label}
          onClick={handlers[mode]}
        />
      ))}
    </div>
  );
}

function CourseSidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-12 w-full items-center gap-2.5 rounded-full px-4 py-3 text-left text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
      )}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </button>
  );
}

function CourseSidebarRailItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full flex-col items-center gap-1.5 rounded-2xl px-2.5 py-3.5 text-center transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}
