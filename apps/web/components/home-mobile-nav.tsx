"use client";

import type { ReactNode } from "react";

import { HOME_NAV_ITEMS, type HomeView } from "@/lib/home-navigation";
import { cn } from "@/lib/utils";

export function HomeMobileNav({
  activeView,
  onViewChange,
}: {
  activeView: HomeView;
  onViewChange: (view: HomeView) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(24,24,27,0.08)] backdrop-blur md:hidden">
      <div
        className="mx-auto grid max-w-xl gap-1 px-1 pb-1"
        style={{ gridTemplateColumns: `repeat(${HOME_NAV_ITEMS.length}, minmax(0, 1fr))` }}
      >
        {HOME_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <HomeMobileNavButton
              key={item.id}
              active={activeView === item.id}
              icon={<Icon />}
              label={item.label}
              onClick={() => onViewChange(item.id)}
            />
          );
        })}
      </div>
    </nav>
  );
}

function HomeMobileNavButton({
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
