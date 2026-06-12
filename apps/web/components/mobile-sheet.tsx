"use client";

import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Bottom sheet with drag gestures: swipe up to maximize, swipe down to
// shrink back or close. Children may render differently when expanded.
// `fixedHeight` gives the collapsed sheet a definite height so children
// with internal scrolling (e.g. the chat) can fill it. With `open={false}`
// the sheet slides away but stays mounted, preserving children state.
export function MobileSheet({
  children,
  fixedHeight = false,
  label,
  onClose,
  open = true,
}: {
  children: ReactNode | ((expanded: boolean, setExpanded: (next: boolean) => void) => ReactNode);
  fixedHeight?: boolean;
  label: string;
  onClose: () => void;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  return (
    <div className="md:hidden">
      {open ? (
        <button
          aria-label={`${label} schließen`}
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden bg-card shadow-2xl",
          // Expanded is an edgeless fullscreen view (page-level, not browser
          // fullscreen); collapsed is the rounded bottom drawer.
          expanded
            ? "h-dvh rounded-none pt-[env(safe-area-inset-top)]"
            : cn("rounded-t-3xl", fixedHeight ? "h-[65dvh]" : "max-h-[65dvh]"),
          dragOffset === 0 && "transition-all duration-200",
          !open && "pointer-events-none invisible translate-y-full",
        )}
        style={open && dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <div
          aria-hidden
          className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-2.5"
          onTouchStart={(event) => {
            dragStartRef.current = event.touches[0].clientY;
          }}
          onTouchMove={(event) => {
            if (dragStartRef.current !== null) {
              setDragOffset(Math.max(0, event.touches[0].clientY - dragStartRef.current));
            }
          }}
          onTouchEnd={(event) => {
            const start = dragStartRef.current;
            dragStartRef.current = null;
            setDragOffset(0);
            const delta = start === null ? 0 : event.changedTouches[0].clientY - start;
            if (delta < -50) {
              setExpanded(true);
            } else if (delta > 50) {
              if (expanded) {
                setExpanded(false);
              } else {
                onClose();
              }
            }
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {typeof children === "function" ? children(expanded, setExpanded) : children}
        </div>
      </div>
    </div>
  );
}
