"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import type { NavigatorBreadcrumb, NavigatorState } from "@/lib/navigator";

/**
 * Minimal mobile-only back bar shown when the user has drilled into a subview.
 * Intentionally separate from the desktop TopBar: no profile menu, no
 * forward button — just a large, thumb-friendly back button and the current
 * location label.
 */
export function MobileDrilldownBar({
  actions,
  breadcrumbs,
  onNavigate,
  title,
}: {
  actions?: ReactNode;
  breadcrumbs: NavigatorBreadcrumb[];
  onNavigate: (state: NavigatorState) => void;
  title?: string;
}) {
  const parent = breadcrumbs[breadcrumbs.length - 2];
  const current = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:hidden">
      <button
        aria-label="Zurück"
        className="grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-colors active:bg-secondary"
        disabled={!parent}
        onClick={() => {
          if (parent) {
            onNavigate(parent.target);
          }
        }}
        type="button"
      >
        <ArrowLeft aria-hidden className="size-5" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {title ?? current?.label ?? ""}
      </span>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
