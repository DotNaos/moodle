"use client";

import { LayoutGrid, List } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GroupedItemsLayout = "list" | "grid";

export type GroupedItemsSection<T> = {
  items: T[];
  key: string;
  label: string;
};

export function GroupedItemsView<T>({
  emptyState,
  header,
  layout,
  onLayoutChange,
  renderGridItem,
  renderListItem,
  sections,
  getItemKey,
  showLayoutToggle = true,
  stickySectionHeaders = true,
  sectionDividers = true,
}: {
  emptyState?: ReactNode;
  header?: ReactNode;
  layout: GroupedItemsLayout;
  onLayoutChange?: (layout: GroupedItemsLayout) => void;
  renderGridItem: (item: T) => ReactNode;
  renderListItem: (item: T) => ReactNode;
  sections: GroupedItemsSection<T>[];
  getItemKey: (item: T) => string;
  showLayoutToggle?: boolean;
  stickySectionHeaders?: boolean;
  sectionDividers?: boolean;
}) {
  const showToolbar = Boolean(header) || (showLayoutToggle && onLayoutChange);
  const hasItems = sections.some((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {showToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {header ? <div className="min-w-0 flex-1">{header}</div> : null}
          {showLayoutToggle && onLayoutChange ? (
            <GroupedItemsLayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
          ) : null}
        </div>
      ) : null}

      {!hasItems && emptyState ? emptyState : null}

      {hasItems ? (
        <div className="flex flex-col">
          {sections.map((section, index) => (
            <section
              key={section.key}
              className={cn("flex flex-col", sectionDividers && index > 0 && "border-t border-border")}
            >
              <GroupedSectionHeader label={section.label} sticky={stickySectionHeaders} />
              {layout === "list" ? (
                <div className="relative z-0 flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <div key={getItemKey(item)}>{renderListItem(item)}</div>
                  ))}
                </div>
              ) : (
                <div className="relative z-0 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  {section.items.map((item) => (
                    <div key={getItemKey(item)} className="shrink-0">
                      {renderGridItem(item)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GroupedSectionHeader({ label, sticky = true }: { label: string; sticky?: boolean }) {
  return (
    <h3
      className={cn(
        "px-2 py-2.5 text-sm font-semibold text-foreground",
        sticky && "sticky top-0 z-20 bg-secondary px-3 shadow-[0_1px_0_0_hsl(var(--border))]",
      )}
    >
      {label}
    </h3>
  );
}

export function GroupedItemsLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: GroupedItemsLayout;
  onLayoutChange: (layout: GroupedItemsLayout) => void;
}) {
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
        <Button
          aria-label="Listenansicht"
          className="h-8 rounded-full px-3"
          type="button"
          variant={layout === "list" ? "default" : "ghost"}
          onClick={() => onLayoutChange("list")}
        >
          <List aria-hidden />
          Liste
        </Button>
        <Button
          aria-label="Rasteransicht"
          className="h-8 rounded-full px-3"
          type="button"
          variant={layout === "grid" ? "default" : "ghost"}
          onClick={() => onLayoutChange("grid")}
        >
          <LayoutGrid aria-hidden />
          Raster
        </Button>
      </div>
    </div>
  );
}
