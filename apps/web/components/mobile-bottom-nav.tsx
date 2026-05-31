"use client";

import { BookOpenText, CheckCircle2, Files, Video } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type MobileMoodleTab = "materials" | "tasks" | "script" | "recordings";

export function MobileBottomNav({
  activeTab,
  onMaterials,
  onRecordings,
  onTasks,
  onScript,
}: {
  activeTab: MobileMoodleTab;
  onMaterials: () => void;
  onRecordings: () => void;
  onTasks: () => void;
  onScript: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(24,24,27,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1 px-1 pb-1">
        <MobileNavButton active={activeTab === "materials"} icon={<Files />} label="Material" onClick={onMaterials} />
        <MobileNavButton
          active={activeTab === "tasks"}
          icon={<CheckCircle2 />}
          label="Aufgaben"
          onClick={onTasks}
        />
        <MobileNavButton
          active={activeTab === "script"}
          icon={<BookOpenText />}
          label="Script"
          onClick={onScript}
        />
        <MobileNavButton active={activeTab === "recordings"} icon={<Video />} label="Videos" onClick={onRecordings} />
      </div>
    </nav>
  );
}

function MobileNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
        !active && "hover:bg-secondary/80 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-5 place-items-center [&>svg]:size-5" aria-hidden>
        {icon}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
