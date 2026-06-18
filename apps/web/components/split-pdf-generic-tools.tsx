"use client";

import { Columns2, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Material } from "@/lib/dashboard-data";

export function GenericSplitActions({
  hasComparison,
  onRepick,
  onSplitOpenChange,
  splitOpen,
}: {
  hasComparison: boolean;
  onRepick: () => void;
  onSplitOpenChange: (open: boolean) => void;
  splitOpen: boolean;
}) {
  const splitTooltip = splitOpen ? "Split View schließen" : "Zweites PDF nebeneinander öffnen";

  return (
    <TooltipProvider>
      {splitOpen && hasComparison ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="Anderes PDF wählen" onClick={onRepick} size="sm" type="button" variant="ghost">
              <FileText aria-hidden />
              <span className="hidden lg:inline">Anderes PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Anderes PDF wählen</TooltipContent>
        </Tooltip>
      ) : null}
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
            <Columns2 aria-hidden />
            <span className="hidden lg:inline">{splitOpen ? "Einzeln" : "Side by side"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{splitTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ComparePlaceholder({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted p-6 text-center text-muted-foreground transition-colors hover:bg-muted-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={onOpen}
      type="button"
    >
      <span className="grid size-11 place-items-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/60">
        <Columns2 className="size-5" aria-hidden />
      </span>
      <span className="max-w-[12rem] text-sm font-medium">Zweites PDF zum Vergleichen wählen</span>
    </button>
  );
}

export function PDFMaterialPicker({
  candidates,
  onCancel,
  onSelect,
}: {
  candidates: Material[];
  onCancel: () => void;
  onSelect: (material: Material) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return candidates;
    }
    return candidates.filter((candidate) =>
      [candidate.name, candidate.sectionName].filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [candidates, query]);

  return (
    <div className="flex h-full min-h-[420px] flex-col bg-muted">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Vergleichen mit</p>
          <h3 className="truncate text-sm font-semibold tracking-tight">Zweites PDF wählen</h3>
        </div>
        <Button aria-label="Abbrechen" onClick={onCancel} size="icon" type="button" variant="ghost">
          <X aria-hidden />
        </Button>
      </div>
      <div className="px-4 pb-3">
        <label className="relative block">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            className="h-10 w-full rounded-full border-0 bg-background/80 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="PDF suchen..."
            type="search"
            value={query}
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">Keine PDFs gefunden.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map((candidate) => (
              <button
                className="min-w-0 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                key={candidate.id}
                onClick={() => onSelect(candidate)}
                type="button"
              >
                <span className="block truncate text-sm font-medium">{candidate.name}</span>
                {candidate.sectionName ? (
                  <span className="block truncate text-xs text-muted-foreground">{candidate.sectionName}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
