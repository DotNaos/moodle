"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { CourseThumbnail } from "@/components/dashboard-ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Course } from "@/lib/dashboard-data";
import { buildCourseGroups, courseSubtitle, courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function ChatCoursePickerModal({
  courses,
  open,
  onOpenChange,
  onSelect,
  selectedCourseId,
}: {
  courses: Course[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (courseId: string) => void;
  selectedCourseId: string | null;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseGroups = buildCourseGroups(courses);
    if (!normalized) {
      return baseGroups;
    }

    return baseGroups
      .map((group) => ({
        ...group,
        courses: group.courses.filter((course) => {
          const haystack = `${courseTitle(course)} ${courseSubtitle(course)}`.toLowerCase();
          return haystack.includes(normalized);
        }),
      }))
      .filter((group) => group.courses.length > 0);
  }, [courses, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-4 py-4 pr-12">
          <DialogTitle>Kurs wählen</DialogTitle>
        </DialogHeader>

        <div className="border-b border-border/60 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              className="pl-10"
              placeholder="Kurs suchen…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Kein Kurs gefunden.</p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="mb-2 last:mb-0">
                <h3 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-1">
                  {group.courses.map((course) => {
                    const active = String(course.id) === selectedCourseId;
                    return (
                      <button
                        key={course.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors",
                          active ? "bg-secondary" : "hover:bg-secondary/70",
                        )}
                        type="button"
                        onClick={() => onSelect(String(course.id))}
                      >
                        <CourseThumbnail active={active} course={course} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{courseTitle(course)}</span>
                          <span className="block truncate text-xs text-muted-foreground">{courseSubtitle(course)}</span>
                        </span>
                        {active ? <Check className="size-4 shrink-0 text-foreground" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
