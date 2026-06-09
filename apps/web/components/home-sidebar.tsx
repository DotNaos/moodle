"use client";

import { CalendarDays, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeSidebar({
  homeView,
  sidebarCollapsed,
  onHomeViewChange,
}: {
  homeView: "courses" | "calendar";
  sidebarCollapsed: boolean;
  onHomeViewChange: (value: "courses" | "calendar") => void;
}) {
  return (
    <aside
      className={cn(
        "hidden min-h-0 w-full min-w-0 flex-col md:flex md:h-full md:max-h-none md:overflow-hidden md:rounded-none md:border-r md:border-border md:bg-background md:shadow-none",
      )}
    >
      <HomeSidebarRail
        hidden={!sidebarCollapsed}
        homeView={homeView}
        onHomeViewChange={onHomeViewChange}
      />
      <div className={cn("min-h-0 flex-1 flex-col gap-2 px-3 py-4", sidebarCollapsed ? "md:hidden" : "flex")}>
        <Button
          className="h-auto min-h-12 w-full justify-start gap-2.5 px-4 py-3 text-sm"
          type="button"
          variant={homeView === "courses" ? "default" : "secondary"}
          onClick={() => onHomeViewChange("courses")}
        >
          <GraduationCap aria-hidden className="size-4" />
          Kurse
        </Button>
        <Button
          className="h-auto min-h-12 w-full justify-start gap-2.5 px-4 py-3 text-sm"
          type="button"
          variant={homeView === "calendar" ? "default" : "secondary"}
          onClick={() => onHomeViewChange("calendar")}
        >
          <CalendarDays aria-hidden className="size-4" />
          Kalender
        </Button>
      </div>
    </aside>
  );
}

function HomeSidebarRail({
  hidden,
  homeView,
  onHomeViewChange,
}: {
  hidden: boolean;
  homeView: "courses" | "calendar";
  onHomeViewChange: (value: "courses" | "calendar") => void;
}) {
  return (
    <div className={cn("hidden h-full w-full flex-col gap-1.5 px-2 py-4", !hidden && "md:flex")}>
      <HomeSidebarRailItem
        active={homeView === "courses"}
        icon={GraduationCap}
        label="Kurse"
        onClick={() => onHomeViewChange("courses")}
      />
      <HomeSidebarRailItem
        active={homeView === "calendar"}
        icon={CalendarDays}
        label="Kalender"
        onClick={() => onHomeViewChange("calendar")}
      />
    </div>
  );
}

function HomeSidebarRailItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof GraduationCap;
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
