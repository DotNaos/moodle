"use client";

import type { ComponentType } from "react";

import { HOME_NAV_ITEMS, type HomeView } from "@/lib/home-navigation";
import { cn } from "@/lib/utils";

export function HomeSidebar({
  homeView,
  sidebarCollapsed,
  onHomeViewChange,
}: {
  homeView: HomeView;
  sidebarCollapsed: boolean;
  onHomeViewChange: (value: HomeView) => void;
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
      <div className={cn("min-h-0 flex-1 flex-col gap-1 px-3 py-4", sidebarCollapsed ? "md:hidden" : "flex")}>
        {HOME_NAV_ITEMS.map((item) => (
          <HomeSidebarButton
            key={item.id}
            active={homeView === item.id}
            icon={item.icon}
            label={item.label}
            onClick={() => onHomeViewChange(item.id)}
          />
        ))}
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
  homeView: HomeView;
  onHomeViewChange: (value: HomeView) => void;
}) {
  return (
    <div className={cn("hidden h-full w-full flex-col gap-1 px-2 py-4", !hidden && "md:flex")}>
      {HOME_NAV_ITEMS.map((item) => (
        <HomeSidebarRailItem
          key={item.id}
          active={homeView === item.id}
          icon={item.icon}
          label={item.label}
          onClick={() => onHomeViewChange(item.id)}
        />
      ))}
    </div>
  );
}

function HomeSidebarButton({
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
        "flex min-h-11 w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </button>
  );
}

function HomeSidebarRailItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: (typeof HOME_NAV_ITEMS)[number]["icon"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full flex-col items-center gap-1 px-1 py-1 text-center"
      type="button"
      onClick={onClick}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span
        className={cn(
          "text-[10px] font-medium leading-tight",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
