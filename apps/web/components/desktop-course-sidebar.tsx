"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";

import { CourseSidebarRow, LoadingRows } from "@/components/dashboard-ui";
import type { Course } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type CourseListGroup = {
  courses: Course[];
  key: string;
  label: string;
};

type DesktopCourseSidebarProps = {
  activeCourseId: string | null;
  collapsed: boolean;
  courseListGroups: CourseListGroup[];
  loading: boolean;
  onResizeBy: (delta: number) => void;
  onResizeStart: (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => void;
  onSelectCourse: (courseId: string) => void;
  onToggleCollapsed: () => void;
  width: number;
};

export function DesktopCourseSidebar({
  activeCourseId,
  collapsed,
  courseListGroups,
  loading,
  onResizeBy,
  onResizeStart,
  onSelectCourse,
  onToggleCollapsed,
  width,
}: DesktopCourseSidebarProps) {
  return (
    <aside
      className={cn(
        "relative hidden h-full min-h-0 shrink-0 flex-col border-r border-border bg-background py-3 md:flex",
        collapsed ? "items-center px-2" : "px-3",
      )}
      style={{ width: collapsed ? 76 : width }}
    >
      <div className={cn("flex shrink-0 items-center gap-2 pb-3", collapsed ? "justify-center px-0" : "px-2")}>
        {collapsed ? null : <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Kurse</h2>}
        <button
          aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          type="button"
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden className="size-4" />
          ) : (
            <PanelLeftClose aria-hidden className="size-4" />
          )}
        </button>
      </div>

      <div className={cn("scrollbar-none min-h-0 flex-1 overflow-y-auto", collapsed ? "w-full" : "pr-1")}>
        {loading && courseListGroups.length === 0 ? (
          collapsed ? null : <LoadingRows label="Kurse laden" />
        ) : courseListGroups.length > 0 ? (
          <div className={cn(collapsed ? "flex flex-col items-center gap-1" : "space-y-4")}>
            {courseListGroups.map((group) => (
              <section className={collapsed ? "flex flex-col items-center gap-1" : undefined} key={group.key}>
                {group.label && !collapsed ? (
                  <p className="mb-1.5 line-clamp-1 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </p>
                ) : null}
                <div className={collapsed ? "flex flex-col items-center gap-1" : "space-y-1"}>
                  {group.courses.map((course) => (
                    <CourseSidebarRow
                      active={String(course.id) === activeCourseId}
                      collapsed={collapsed}
                      course={course}
                      key={course.id}
                      onSelect={() => onSelectCourse(String(course.id))}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          collapsed ? null : <p className="px-2 py-3 text-sm text-muted-foreground">Keine Kurse geladen.</p>
        )}
      </div>
      {!collapsed ? <SidebarResizeHandle onPointerDown={onResizeStart} onResizeBy={onResizeBy} /> : null}
    </aside>
  );
}

function SidebarResizeHandle({
  onPointerDown,
  onResizeBy,
}: {
  onPointerDown: (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => void;
  onResizeBy: (delta: number) => void;
}) {
  return (
    <button
      aria-label="Sidebar-Breite anpassen"
      className="group absolute right-0 top-0 z-10 h-full w-3 translate-x-1/2 !cursor-col-resize touch-none"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onResizeBy(-16);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onResizeBy(16);
        }
      }}
      onPointerDown={onPointerDown}
      type="button"
    >
      <span className="mx-auto block h-full w-px !cursor-col-resize bg-transparent transition-all group-hover:bg-gradient-to-b group-hover:from-transparent group-hover:via-border group-hover:to-transparent group-focus-visible:bg-gradient-to-b group-focus-visible:from-transparent group-focus-visible:via-border group-focus-visible:to-transparent" />
    </button>
  );
}
