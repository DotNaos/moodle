"use client";

import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Files,
  GitBranch,
  Plus,
  Sigma,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { CourseHero } from "@/components/course-hero";
import { StudyPipelineAction } from "@/components/study-pipeline-action";
import { Spinner } from "@/components/ui/spinner";
import type { CalendarEventSummary } from "@/hooks/use-calendar-events";
import type { Course } from "@/lib/dashboard-data";
import { HOME_NAV_ITEMS, type HomeView } from "@/lib/home-navigation";
import { COURSE_MODE_LABELS, type CourseMode } from "@/lib/navigator";
import { readRecentChats, type RecentChatEntry } from "@/lib/recent-chat-storage";
import { cn } from "@/lib/utils";

export type CourseModeItem = {
  description: string;
  icon: LucideIcon;
  label: string;
  mode: CourseMode;
};

export const COURSE_MODE_ITEMS: CourseModeItem[] = [
  { mode: "materials", icon: Files, label: COURSE_MODE_LABELS.materials, description: "PDFs, Folien und Links" },
  { mode: "tasks", icon: CheckCircle2, label: COURSE_MODE_LABELS.tasks, description: "Aufgabenblätter bearbeiten" },
  { mode: "script", icon: BookOpenText, label: COURSE_MODE_LABELS.script, description: "Zusammengefasstes Script" },
  { mode: "formula", icon: Sigma, label: COURSE_MODE_LABELS.formula, description: "Formelsammlung" },
  { mode: "recordings", icon: Video, label: COURSE_MODE_LABELS.recordings, description: "Webex-Aufzeichnungen" },
  { mode: "pipeline", icon: GitBranch, label: COURSE_MODE_LABELS.pipeline, description: "Verarbeitung prüfen" },
];

export type NavigatorListVariant = "full" | "sidebar";

// ① Landing: the big-picture entry view; everything starts here.
export function LandingPanel({
  courseCount,
  eventCount,
  onOpenSection,
}: {
  courseCount: number | null;
  eventCount: number | null;
  onOpenSection: (section: HomeView) => void;
}) {
  const [chatCount, setChatCount] = useState<number | null>(null);

  useEffect(() => {
    setChatCount(readRecentChats().length);
  }, []);

  const subtitles: Record<HomeView, string> = {
    courses: courseCount !== null ? `${courseCount} Kurse` : "Materialien & Aufgaben",
    calendar: eventCount !== null ? `${eventCount} kommende Termine` : "Termine & Abgaben",
    chat: chatCount ? `${chatCount} letzte Verläufe` : "Fragen & Lernen",
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto md:h-full">
      <div className="mx-auto grid w-full max-w-3xl flex-1 content-center gap-6 px-4 py-10 md:px-6">
        <h2 className="text-center text-xl font-semibold tracking-tight">Womit möchtest du starten?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {HOME_NAV_ITEMS.map((item) => (
            <button
              className="group flex flex-col items-center gap-3 rounded-3xl bg-secondary/60 px-4 py-8 text-center transition-colors hover:bg-secondary"
              key={item.id}
              onClick={() => onOpenSection(item.id)}
              type="button"
            >
              <span className="grid size-14 place-items-center rounded-full bg-background text-foreground transition-transform group-hover:scale-105">
                <item.icon aria-hidden className="size-6" />
              </span>
              <span>
                <span className="block text-base font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{subtitles[item.id]}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ③ Course level: mode selection, full width. The course is drilled into,
// not opened — no document yet.
export function CourseModesPanel({
  course,
  courseId,
  materialsCount,
  onSelectMode,
}: {
  course: Course | null;
  courseId: string;
  materialsCount: number | null;
  onSelectMode: (mode: CourseMode) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      <div className="min-h-0 flex-1 overflow-auto">
        {course ? <CourseHero course={course} /> : null}
        <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-6">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {COURSE_MODE_ITEMS.map((item) => (
              <button
                className="group flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-4 text-left transition-colors hover:bg-secondary"
                key={item.mode}
                onClick={() => onSelectMode(item.mode)}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
                  <item.icon aria-hidden className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.mode === "materials" && materialsCount !== null
                      ? `${materialsCount} Ressourcen`
                      : item.description}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
          <div className="mt-6">
            <StudyPipelineAction courseId={courseId} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Calendar drill level: upcoming events plus the entry to the real calendar.
// Renders full width while nothing is open, compact as the split sidebar.
export function CalendarEventsPanel({
  activeEventUid,
  error,
  events,
  loading,
  onOpenEvent,
  onOpenGrid,
  variant,
}: {
  activeEventUid: string | null;
  error: string | null;
  events: CalendarEventSummary[];
  loading: boolean;
  onOpenEvent: (eventUid: string) => void;
  onOpenGrid: () => void;
  variant: NavigatorListVariant;
}) {
  const upcoming = events.filter((event) => Date.parse(event.end ?? event.start) >= Date.now());

  return (
    <NavigatorListShell variant={variant}>
      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        onClick={onOpenGrid}
        type="button"
      >
        <CalendarDays aria-hidden className="size-4" />
        Kalender öffnen
      </button>
      {loading && upcoming.length === 0 ? (
        <ListLoading label="Events laden" />
      ) : error ? (
        <p className="px-1 text-xs leading-5 text-muted-foreground">{error}</p>
      ) : upcoming.length > 0 ? (
        <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
          {upcoming.map((event) => {
            const active = activeEventUid === event.uid;
            return (
              <button
                className={cn(
                  "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
                key={event.uid || `${event.start}-${event.summary}`}
                onClick={() => onOpenEvent(event.uid)}
                type="button"
              >
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{event.summary}</p>
                <p className={cn("mt-1 text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatEventTime(event.start, event.end)}
                </p>
                {event.courseName ? (
                  <p className={cn("mt-0.5 line-clamp-1 text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {event.courseName}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-xs leading-5 text-muted-foreground">Keine kommenden Events gefunden.</p>
      )}
    </NavigatorListShell>
  );
}

// Detail viewer for a single calendar event (split layout main view).
export function CalendarEventDetailPanel({
  error,
  event,
  loading,
  onOpenCourse,
}: {
  error: string | null;
  event: CalendarEventSummary | null;
  loading: boolean;
  onOpenCourse: ((courseName: string) => void) | null;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto md:h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        {loading && !event ? (
          <ListLoading label="Termin laden" />
        ) : !event ? (
          <p className="text-sm text-muted-foreground">{error ?? "Dieser Termin wurde nicht gefunden."}</p>
        ) : (
          <div className="rounded-3xl bg-secondary/60 px-6 py-6">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Termin</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{event.summary}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{formatEventTime(event.start, event.end)}</p>
            {event.location ? <p className="mt-1 text-sm text-muted-foreground">Ort: {event.location}</p> : null}
            {event.courseName ? (
              <div className="mt-5 flex items-center gap-2">
                <p className="text-sm">
                  Kurs: <span className="font-medium">{event.courseName}</span>
                </p>
                {onOpenCourse ? (
                  <button
                    className="rounded-full bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                    onClick={() => onOpenCourse(event.courseName ?? "")}
                    type="button"
                  >
                    Zum Kurs
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

// Chat drill level: recent sessions; a session (or "new chat") opens as the
// document and this list becomes the sidebar.
export function ChatSessionsPanel({
  activeSessionId,
  onNewChat,
  onOpenSession,
  variant,
}: {
  activeSessionId: string | null;
  onNewChat: () => void;
  onOpenSession: (session: RecentChatEntry) => void;
  variant: NavigatorListVariant;
}) {
  const [sessions, setSessions] = useState<RecentChatEntry[]>([]);

  useEffect(() => {
    setSessions(readRecentChats());
  }, [activeSessionId]);

  return (
    <NavigatorListShell variant={variant}>
      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        onClick={onNewChat}
        type="button"
      >
        <Plus aria-hidden className="size-4" />
        Neuer Chat
      </button>
      {sessions.length > 0 ? (
        <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
          {sessions.map((session) => {
            const active = activeSessionId === session.id;
            return (
              <button
                className={cn(
                  "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
                key={session.id}
                onClick={() => onOpenSession(session)}
                type="button"
              >
                <p className="line-clamp-1 text-sm font-semibold leading-snug">{session.title}</p>
                <p className={cn("mt-1 line-clamp-2 text-xs leading-4", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {session.preview}
                </p>
                <p className={cn("mt-1 line-clamp-1 text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {session.courseTitle ? `${session.courseTitle} · ` : ""}
                  {formatChatTime(session.updatedAt)}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          Sobald du einen Chat startest, taucht er hier als Schnellzugriff auf.
        </p>
      )}
    </NavigatorListShell>
  );
}

function NavigatorListShell({ children, variant }: { children: React.ReactNode; variant: NavigatorListVariant }) {
  if (variant === "sidebar") {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">{children}</div>;
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-3 px-4 py-5 md:px-6">
        {children}
      </div>
    </section>
  );
}

function ListLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
      <Spinner className="size-4" />
      {label}
    </div>
  );
}

export function formatEventTime(startValue: string, endValue?: string): string {
  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : null;
  if (Number.isNaN(start.getTime())) {
    return "Termin";
  }
  const day = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" }).format(start);
  const time = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(start);
  if (!end || Number.isNaN(end.getTime())) {
    return `${day}, ${time}`;
  }
  const endTime = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(end);
  return `${day}, ${time}-${endTime}`;
}

function formatChatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Gerade eben";
  }
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
