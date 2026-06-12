"use client";

import { Check, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Course, Material } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type CourseResourcePickerModalProps = {
  open: boolean;
  course: Course | null;
  loadMaterials: (courseId: string) => Promise<Material[]>;
  selectedIds: string[];
  onConfirm: (materials: Material[]) => void;
  onOpenChange: (open: boolean) => void;
};

export function CourseResourcePickerModal({
  open,
  course,
  loadMaterials,
  selectedIds,
  onConfirm,
  onOpenChange,
}: CourseResourcePickerModalProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      return;
    }
    setChecked(new Set(selectedIds));
    setQuery("");
    if (!course) {
      setMaterials([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadMaterials(String(course.id))
      .then((loaded) => {
        if (!cancelled) {
          setMaterials(loaded);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Materialien konnten nicht geladen werden.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // selectedIds is intentionally read only when the modal (re)opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course, loadMaterials]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return materials;
    }
    return materials.filter((material) =>
      `${material.name} ${material.sectionName ?? ""} ${material.fileType ?? material.type ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [materials, query]);

  const allFilteredChecked = filtered.length > 0 && filtered.every((material) => checked.has(material.id));

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setChecked((current) => {
      const next = new Set(current);
      if (allFilteredChecked) {
        for (const material of filtered) {
          next.delete(material.id);
        }
      } else {
        for (const material of filtered) {
          next.add(material.id);
        }
      }
      return next;
    });
  }

  function confirm() {
    onConfirm(materials.filter((material) => checked.has(material.id)));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-4 py-4 pr-12">
          <DialogTitle className="truncate">
            Ressourcen{course ? ` · ${courseTitle(course)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="pl-10"
              placeholder="Ressource suchen…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            disabled={filtered.length === 0}
            type="button"
            onClick={toggleAll}
          >
            {allFilteredChecked ? "Keine" : "Alle"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!course ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Wähle zuerst einen Kurs.</p>
          ) : error ? (
            <p className="px-3 py-8 text-center text-sm text-destructive">{error}</p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-muted-foreground">
              <Spinner aria-hidden className="size-4" />
              Lädt…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Keine Ressourcen gefunden.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((material) => {
                const isChecked = checked.has(material.id);
                return (
                  <li key={material.id}>
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                        isChecked ? "bg-secondary" : "hover:bg-secondary/70",
                      )}
                      type="button"
                      onClick={() => toggle(material.id)}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isChecked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {isChecked ? <Check className="size-3.5" /> : null}
                      </span>
                      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{material.name}</span>
                        {material.sectionName || material.fileType || material.type ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {[material.sectionName, material.fileType ?? material.type].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-4 py-3 sm:justify-between">
          <span className="self-center text-xs text-muted-foreground">{checked.size} ausgewählt</span>
          <div className="flex gap-2">
            <Button className="rounded-full" type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button className="rounded-full" disabled={checked.size === 0} type="button" onClick={confirm}>
              Hinzufügen{checked.size > 0 ? ` (${checked.size})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
