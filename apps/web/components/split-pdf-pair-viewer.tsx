"use client";

import { ChevronLeft, ChevronRight, Columns2, FileCheck2, FileText } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PDFDocumentViewerMode } from "@/components/pdf-document-viewer-mode";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Material } from "@/lib/dashboard-data";
import { shouldHandleAppLinkClick } from "@/lib/link-events";
import type { findTaskSheetSolutionPair } from "@/lib/material-pairs";
import { buildNavigatorURL, homeState, openDocument } from "@/lib/navigator";
import type { PDFScrollCommand, PDFViewState } from "@/lib/pdf-context";
import { cn } from "@/lib/utils";

const MIN_SPLIT_PANEL_PERCENT = 28;
const MAX_SPLIT_PANEL_PERCENT = 72;
const SPLIT_PANEL_CLOSE_THRESHOLD_PERCENT = 16;
const SPLIT_PANEL_KEYBOARD_STEP = 4;

type TaskSheetPair = NonNullable<ReturnType<typeof findTaskSheetSolutionPair>>;
type TaskSheetPairRole = "sheet" | "solution";

export function SplitPDFPairViewer({
  courseId,
  material,
  onOpenMaterial,
  onPDFStateChange,
  onSplitOpenChange,
  pair,
  pdfScrollCommand,
  splitOpen,
}: {
  courseId: string;
  material: Material;
  onOpenMaterial?: (material: Material) => void;
  onPDFStateChange: (state: PDFViewState | null) => void;
  onSplitOpenChange: (open: boolean) => void;
  pair: TaskSheetPair;
  pdfScrollCommand: PDFScrollCommand | null;
  splitOpen: boolean;
}) {
  const leftMaterial = pair.sheet;
  const rightMaterial = pair.solution;
  const selectedOnLeft = material.id === leftMaterial.id;
  const selectedOnRight = material.id === rightMaterial.id;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftPercent, setLeftPercent] = useState(50);
  const [edgeHoverRole, setEdgeHoverRole] = useState<TaskSheetPairRole | null>(null);
  const [previewRole, setPreviewRole] = useState<TaskSheetPairRole | null>(null);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (splitOpen) {
      setEdgeHoverRole(null);
      setPreviewRole(null);
    }
  }, [splitOpen]);

  const closeSplitTo = useCallback((role: TaskSheetPairRole) => {
    const target = role === "sheet" ? leftMaterial : rightMaterial;
    setEdgeHoverRole(null);
    setResizing(false);
    setPreviewRole(null);
    onSplitOpenChange(false);
    if (target.id !== material.id) {
      onOpenMaterial?.(target);
    }
  }, [leftMaterial, material.id, onOpenMaterial, onSplitOpenChange, rightMaterial]);

  const openSplit = useCallback(() => {
    setEdgeHoverRole(null);
    setPreviewRole(null);
    onSplitOpenChange(true);
  }, [onSplitOpenChange]);

  const resizeFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect?.width) {
      return;
    }

    const nextPercent = ((clientX - rect.left) / rect.width) * 100;
    if (nextPercent <= SPLIT_PANEL_CLOSE_THRESHOLD_PERCENT) {
      closeSplitTo("solution");
      return;
    }
    if (nextPercent >= 100 - SPLIT_PANEL_CLOSE_THRESHOLD_PERCENT) {
      closeSplitTo("sheet");
      return;
    }
    setLeftPercent(clampSplitPanelPercent(nextPercent));
  }, [closeSplitTo]);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      resizeFromClientX(event.clientX);
    };
    const stopResizing = () => setResizing(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [resizeFromClientX, resizing]);

  return (
    <div
      className={cn(
        "relative h-full min-h-0 overflow-hidden bg-border",
        splitOpen ? "flex flex-col gap-px md:flex-row md:gap-0" : "bg-muted",
      )}
      ref={containerRef}
      style={{
        "--left-panel-width": `${leftPercent}%`,
        "--right-panel-width": `${100 - leftPercent}%`,
      } as React.CSSProperties}
    >
      <div
        className={getSplitPanelClass({
          previewing: previewRole === "sheet",
          role: "sheet",
          selected: selectedOnLeft,
          splitOpen,
        })}
        onFocusCapture={() => {
          if (!splitOpen && !selectedOnLeft) {
            setPreviewRole("sheet");
          }
        }}
        onMouseEnter={() => {
          if (!splitOpen && !selectedOnLeft) {
            setPreviewRole("sheet");
          }
        }}
        onMouseLeave={() => {
          if (!splitOpen && !selectedOnLeft) {
            setPreviewRole(null);
          }
        }}
      >
        <PDFDocumentViewerMode
          allowFloat={!splitOpen && selectedOnLeft}
          courseId={courseId}
          externalUrl={leftMaterial.url}
          materialId={leftMaterial.id}
          onStateChange={selectedOnLeft ? onPDFStateChange : noopPDFStateChange}
          scrollCommand={selectedOnLeft ? pdfScrollCommand : null}
          title={leftMaterial.name}
          toolbarExtra={selectedOnLeft ? (
            <TaskSheetPairActions
              courseId={courseId}
              onOpenMaterial={onOpenMaterial}
              onSplitOpenChange={onSplitOpenChange}
              pair={pair}
              splitOpen={splitOpen}
            />
          ) : null}
          url={pdfPreviewUrl(courseId, leftMaterial)}
        />
        {!splitOpen && selectedOnLeft ? (
          <SplitEdgeHoverZone
            onHoverChange={(hovering) => setPreviewRole(hovering ? "solution" : null)}
            onOpen={openSplit}
            role="solution"
          />
        ) : null}
        {!splitOpen && !selectedOnLeft ? (
          <SplitEdgeRevealButton
            active={edgeHoverRole === "sheet"}
            onHoverChange={(hovering) => {
              setEdgeHoverRole(hovering ? "sheet" : null);
              setPreviewRole(hovering ? "sheet" : null);
            }}
            onOpen={openSplit}
            role="sheet"
          />
        ) : null}
      </div>
      {splitOpen ? (
        <SplitPanelResizeHandle
          onResizeBy={(delta) => setLeftPercent((current) => clampSplitPanelPercent(current + delta))}
          onResizeStart={(event) => {
            event.preventDefault();
            resizeFromClientX(event.clientX);
            setResizing(true);
          }}
          resizing={resizing}
        />
      ) : null}
      <div
        className={getSplitPanelClass({
          previewing: previewRole === "solution",
          role: "solution",
          selected: selectedOnRight,
          splitOpen,
        })}
        onFocusCapture={() => {
          if (!splitOpen && !selectedOnRight) {
            setPreviewRole("solution");
          }
        }}
        onMouseEnter={() => {
          if (!splitOpen && !selectedOnRight) {
            setPreviewRole("solution");
          }
        }}
        onMouseLeave={() => {
          if (!splitOpen && !selectedOnRight) {
            setPreviewRole(null);
          }
        }}
      >
        <PDFDocumentViewerMode
          allowFloat={!splitOpen && selectedOnRight}
          courseId={courseId}
          externalUrl={rightMaterial.url}
          materialId={rightMaterial.id}
          onStateChange={selectedOnRight ? onPDFStateChange : noopPDFStateChange}
          scrollCommand={selectedOnRight ? pdfScrollCommand : null}
          title={rightMaterial.name}
          toolbarExtra={selectedOnRight ? (
            <TaskSheetPairActions
              courseId={courseId}
              onOpenMaterial={onOpenMaterial}
              onSplitOpenChange={onSplitOpenChange}
              pair={pair}
              splitOpen={splitOpen}
            />
          ) : null}
          url={pdfPreviewUrl(courseId, rightMaterial)}
        />
        {!splitOpen && selectedOnRight ? (
          <SplitEdgeHoverZone
            onHoverChange={(hovering) => setPreviewRole(hovering ? "sheet" : null)}
            onOpen={openSplit}
            role="sheet"
          />
        ) : null}
        {!splitOpen && !selectedOnRight ? (
          <SplitEdgeRevealButton
            active={edgeHoverRole === "solution"}
            onHoverChange={(hovering) => {
              setEdgeHoverRole(hovering ? "solution" : null);
              setPreviewRole(hovering ? "solution" : null);
            }}
            onOpen={openSplit}
            role="solution"
          />
        ) : null}
      </div>
    </div>
  );
}

function getSplitPanelClass({
  previewing,
  role,
  selected,
  splitOpen,
}: {
  previewing: boolean;
  role: TaskSheetPairRole;
  selected: boolean;
  splitOpen: boolean;
}) {
  if (splitOpen) {
    return cn(
      "relative min-h-[420px] min-w-0 bg-muted md:min-h-0 md:shrink-0 md:grow-0",
      role === "sheet" ? "md:basis-[var(--left-panel-width)]" : "md:basis-[var(--right-panel-width)]",
    );
  }

  if (selected) {
    return "relative h-full min-h-[420px] min-w-0 bg-muted md:absolute md:inset-0 md:z-10 md:min-h-0 md:w-full";
  }

  if (role === "sheet") {
    return cn(
      "group hidden min-w-0 bg-muted md:absolute md:inset-y-0 md:left-0 md:z-20 md:block md:h-full md:w-[min(42rem,56%)] md:min-w-[280px] md:shadow-2xl md:transition-transform md:duration-200 md:ease-out",
      previewing ? "md:-translate-x-[calc(100%-9rem)]" : "md:-translate-x-full",
    );
  }

  return cn(
    "group hidden min-w-0 bg-muted md:absolute md:inset-y-0 md:right-0 md:z-20 md:block md:h-full md:w-[min(42rem,56%)] md:min-w-[280px] md:shadow-2xl md:transition-transform md:duration-200 md:ease-out",
    previewing ? "md:translate-x-[calc(100%-9rem)]" : "md:translate-x-full",
  );
}

function SplitEdgeHoverZone({
  onHoverChange,
  onOpen,
  role,
}: {
  onHoverChange: (hovering: boolean) => void;
  onOpen: () => void;
  role: TaskSheetPairRole;
}) {
  return (
    <button
      aria-label={role === "sheet" ? "Aufgabenblatt einblenden" : "Lösung einblenden"}
      className={cn("absolute top-0 z-40 hidden h-full w-12 bg-transparent p-0 md:block", role === "sheet" ? "left-0" : "right-0")}
      onClick={onOpen}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onMouseMove={() => onHoverChange(true)}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onPointerMove={() => onHoverChange(true)}
      tabIndex={-1}
      type="button"
    />
  );
}

function SplitPanelResizeHandle({
  onResizeBy,
  onResizeStart,
  resizing,
}: {
  onResizeBy: (delta: number) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  resizing: boolean;
}) {
  return (
    <button
      aria-label="Split-View-Breite anpassen"
      className={cn(
        "group absolute left-[var(--left-panel-width)] top-0 z-30 hidden h-full w-5 -translate-x-1/2 !cursor-col-resize touch-none md:block",
        resizing && "bg-foreground/[0.03]",
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onResizeBy(-SPLIT_PANEL_KEYBOARD_STEP);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onResizeBy(SPLIT_PANEL_KEYBOARD_STEP);
        }
        if (event.key === "Home") {
          event.preventDefault();
          onResizeBy(MIN_SPLIT_PANEL_PERCENT - MAX_SPLIT_PANEL_PERCENT);
        }
        if (event.key === "End") {
          event.preventDefault();
          onResizeBy(MAX_SPLIT_PANEL_PERCENT - MIN_SPLIT_PANEL_PERCENT);
        }
      }}
      onPointerDown={onResizeStart}
      type="button"
    >
      <span
        className={cn(
          "mx-auto block h-full w-px !cursor-col-resize bg-transparent transition-all",
          "group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-border group-hover:to-transparent",
          "group-focus-visible:bg-gradient-to-b group-focus-visible:from-transparent group-focus-visible:via-border group-focus-visible:to-transparent",
          resizing && "bg-gradient-to-b from-transparent via-border to-transparent",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border/0 transition-colors",
          "group-hover:bg-border/80 group-focus-visible:bg-border/80",
          resizing && "bg-border",
        )}
      />
    </button>
  );
}

function clampSplitPanelPercent(value: number): number {
  return Math.min(MAX_SPLIT_PANEL_PERCENT, Math.max(MIN_SPLIT_PANEL_PERCENT, Math.round(value * 10) / 10));
}

function SplitEdgeRevealButton({
  active,
  onHoverChange,
  onOpen,
  role,
}: {
  active: boolean;
  onHoverChange: (hovering: boolean) => void;
  onOpen: () => void;
  role: TaskSheetPairRole;
}) {
  const opensLabel = role === "sheet" ? "Aufgabenblatt einblenden" : "Lösung einblenden";
  const floatingLabel = role === "sheet" ? "Show assignment" : "Show solution";
  const Icon = role === "sheet" ? ChevronRight : ChevronLeft;
  const edgeClass = role === "sheet" ? "right-0" : "left-0";
  const gradientClass = role === "sheet"
    ? "bg-gradient-to-l from-background/90 via-background/45 to-transparent"
    : "bg-gradient-to-r from-background/90 via-background/45 to-transparent";
  const labelClass = role === "sheet" ? "left-full ml-3" : "right-full mr-3";

  return (
    <div className={cn("absolute top-0 z-30 hidden h-full w-36 md:block", role === "sheet" ? "right-0" : "left-0")}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={opensLabel}
              className={cn(
                "group/edge pointer-events-auto absolute inset-y-0 flex w-36 items-center justify-center opacity-90 backdrop-blur-[1px] transition",
                "text-muted-foreground/75 hover:text-foreground focus-visible:text-foreground",
                "hover:bg-muted-foreground/10 hover:opacity-100 focus-visible:bg-muted-foreground/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                "group-hover:opacity-90",
                active && "opacity-100 text-foreground",
                edgeClass,
                gradientClass,
              )}
              onBlur={() => onHoverChange(false)}
              onFocus={() => onHoverChange(true)}
              onMouseEnter={() => onHoverChange(true)}
              onMouseLeave={() => onHoverChange(false)}
              onPointerEnter={() => onHoverChange(true)}
              onPointerLeave={() => onHoverChange(false)}
              onClick={onOpen}
              type="button"
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full bg-background/80 shadow-lg ring-1 ring-border/60 transition group-hover:bg-background/90 group-hover:ring-border group-hover/edge:scale-110 group-hover/edge:bg-foreground group-hover/edge:text-background group-hover/edge:ring-foreground/20",
                  active && "scale-110 bg-foreground text-background ring-foreground/20",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <FloatingEdgeLabel active={active} className={labelClass}>{floatingLabel}</FloatingEdgeLabel>
            </button>
          </TooltipTrigger>
          <TooltipContent side={role === "sheet" ? "right" : "left"}>{opensLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function FloatingEdgeLabel({
  active,
  children,
  className,
}: {
  active: boolean;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground opacity-0 shadow-lg ring-1 ring-border/60 transition group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100",
        active && "opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

function TaskSheetPairActions({
  courseId,
  onOpenMaterial,
  onSplitOpenChange,
  pair,
  splitOpen,
}: {
  courseId: string;
  onOpenMaterial?: (material: Material) => void;
  onSplitOpenChange: (open: boolean) => void;
  pair: TaskSheetPair;
  splitOpen: boolean;
}) {
  const counterpartLabel = pair.role === "sheet" ? "Lösung" : "Aufgabenblatt";
  const SwitchIcon = pair.role === "sheet" ? FileCheck2 : FileText;
  const splitTooltip = splitOpen
    ? "Split View schließen"
    : "Aufgabenblatt und Lösung nebeneinander öffnen";
  const counterpartHref = buildNavigatorURL(openDocument(homeState(), {
    kind: "material",
    courseId,
    materialId: pair.counterpart.id,
  }));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild aria-label={`${counterpartLabel} öffnen`} size="sm" variant="ghost">
            <a
              href={counterpartHref}
              onClick={(event) => {
                if (!onOpenMaterial || !shouldHandleAppLinkClick(event)) {
                  return;
                }
                event.preventDefault();
                onOpenMaterial(pair.counterpart);
              }}
            >
              <SwitchIcon aria-hidden />
              <span className="hidden lg:inline">{counterpartLabel}</span>
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{counterpartLabel} öffnen</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={splitTooltip}
            aria-pressed={splitOpen}
            className={splitOpen ? "bg-secondary text-foreground" : undefined}
            onClick={() => onSplitOpenChange(!splitOpen)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <SplitViewIcon activeRole={pair.role} splitOpen={splitOpen} />
            <span className="hidden lg:inline">{splitOpen ? "Einzeln" : "Side by side"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{splitTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SplitViewIcon({ activeRole, splitOpen }: { activeRole: TaskSheetPairRole; splitOpen: boolean }) {
  const sheetVisible = splitOpen || activeRole === "sheet";
  const solutionVisible = splitOpen || activeRole === "solution";

  return (
    <span className="relative inline-grid size-4 place-items-center" aria-hidden>
      <span
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[42%] rounded-[3px] transition-colors",
          sheetVisible ? activeRole === "sheet" ? "bg-sky-500/70" : "bg-sky-500/25" : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "absolute inset-y-0.5 right-0.5 w-[42%] rounded-[3px] transition-colors",
          solutionVisible ? activeRole === "solution" ? "bg-amber-500/70" : "bg-amber-500/25" : "bg-transparent",
        )}
      />
      <Columns2 className="relative size-4" aria-hidden />
    </span>
  );
}

function noopPDFStateChange() {
  // Secondary split-view PDFs should not replace the active chat/PDF context.
}

function pdfPreviewUrl(courseId: string, material: Material): string {
  return `/api/moodle/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(material.id)}/pdf`;
}
