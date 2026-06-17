"use client";

import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Files,
  GitBranch,
  MessageSquare,
  Plus,
  Circle,
  Sigma,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { CourseHero } from "@/components/course-hero";
import { MaterialFileIcon } from "@/components/dashboard-ui";
import { StudyPipelineAction } from "@/components/study-pipeline-action";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { CalendarEventSummary } from "@/hooks/use-calendar-events";
import type { Course, Material, WebexRecordingState } from "@/lib/dashboard-data";
import { courseSubtitle, courseTitle } from "@/lib/dashboard-data";
import { shouldHandleAppLinkClick } from "@/lib/link-events";
import { buildNavigatorURL, COURSE_MODE_LABELS, homeState, openDocument, type CourseMode } from "@/lib/navigator";
import { readRecentChats, subscribeRecentChats, type RecentChatEntry } from "@/lib/recent-chat-storage";
import { taskDisplayTitle, type StudyOutline } from "@/lib/study-outline";
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

const COURSE_PREVIEW_SLOT_COUNT = 4;

// ③ Course level: mode selection, full width. The course is drilled into,
// not opened — no document yet.
export function CourseModesPanel({
  calendarError,
  calendarEvents,
  calendarLoading,
  course,
  courseId,
  materials,
  materialsReady,
  onEnsureMaterials,
  onNewChat,
  onOpenCalendar,
  onOpenChat,
  onOpenEvent,
  onOpenMaterial,
  onOpenRecording,
  onOpenTask,
  onSelectMode,
  recordingsState,
  studyOutline,
}: {
  calendarError: string | null;
  calendarEvents: CalendarEventSummary[];
  calendarLoading: boolean;
  course: Course | null;
  courseId: string;
  materials: Material[];
  materialsReady: boolean;
  onEnsureMaterials: (courseId: string) => void;
  onNewChat: () => void;
  onOpenCalendar: () => void;
  onOpenChat: (session: RecentChatEntry) => void;
  onOpenEvent: (eventUid: string) => void;
  onOpenMaterial: (material: Material) => void;
  onOpenRecording: (recordingId: string) => void;
  onOpenTask: (taskId: string) => void;
  onSelectMode: (mode: CourseMode) => void;
  recordingsState?: WebexRecordingState;
  studyOutline: StudyOutline;
}) {
  const [recentChats, setRecentChats] = useState<RecentChatEntry[]>([]);
  useEffect(() => {
    const refresh = () => setRecentChats(readRecentChats().filter((chat) => chat.courseId === courseId).slice(0, 3));
    refresh();
    return subscribeRecentChats(refresh);
  }, [courseId]);

  useEffect(() => {
    if (!materialsReady) {
      onEnsureMaterials(courseId);
    }
  }, [courseId, materialsReady, onEnsureMaterials]);

  const courseEvents = course
    ? relevantCourseEvents(calendarEvents, course)
      .filter((event) => Date.parse(event.end ?? event.start) >= Date.now())
      .slice(0, 3)
    : [];
  const recentMaterials = materials.filter(isPdfMaterial).sort(compareMaterialsByRecency).slice(0, COURSE_PREVIEW_SLOT_COUNT);
  const taskMaterials = materials.filter(isTaskMaterial).slice(0, COURSE_PREVIEW_SLOT_COUNT);
  const nextTasks = studyOutline.tasks
    .filter((task) => !isDoneTaskStatus(task.status))
    .slice(0, COURSE_PREVIEW_SLOT_COUNT);
  const recordings = recordingsState?.recordings
    ? [...recordingsState.recordings].sort(compareRecordingsByDate).slice(0, 3)
    : [];
  const showRecordingsPreview = Boolean(recordingsState?.loaded || recordings.length > 0 || recordingsState?.loading || recordingsState?.error);
  const secondaryModeItems = COURSE_MODE_ITEMS.filter((item) => {
    if (item.mode === "materials" || item.mode === "tasks") {
      return false;
    }
    return item.mode !== "recordings" || !showRecordingsPreview;
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      <div className="min-h-0 flex-1 overflow-auto">
        {course ? <CourseHero course={course} /> : null}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-5 md:px-6 md:py-6">
          <CourseOverviewSection
            icon={<Files aria-hidden className="size-4 text-muted-foreground" />}
            onOpen={() => onSelectMode("materials")}
            title="Materialien"
          >
            {recentMaterials.length > 0 ? (
              <CoursePreviewGrid>
                {recentMaterials.map((material) => (
                  <CoursePreviewButton
                    href={materialHref(courseId, material)}
                    icon={<MaterialFileIcon material={material} size={18} />}
                    key={material.id}
                    meta={material.sectionName ?? material.type ?? "Material"}
                    title={material.name}
                    onOpen={() => onOpenMaterial(material)}
                  />
                ))}
              </CoursePreviewGrid>
            ) : (
              materialsReady ? <CoursePreviewBlankGrid /> : <CoursePreviewSkeletonGrid />
            )}
          </CourseOverviewSection>

          <CourseOverviewSection
            icon={<CheckCircle2 aria-hidden className="size-4 text-muted-foreground" />}
            onOpen={() => onSelectMode("tasks")}
            title="Aufgaben"
          >
            {nextTasks.length > 0 ? (
              <CoursePreviewGrid>
                {nextTasks.map((task) => (
                  <CoursePreviewButton
                    icon={<TaskProgressIcon status={task.status} />}
                    iconVariant="plain"
                    key={task.id}
                    meta={task.sheetTitle}
                    title={taskDisplayTitle(task.sheetTitle, task.title)}
                    onOpen={() => onOpenTask(task.id)}
                  />
                ))}
              </CoursePreviewGrid>
            ) : taskMaterials.length > 0 ? (
              <CoursePreviewGrid>
                {taskMaterials.map((material) => (
                  <CoursePreviewButton
                    href={materialHref(courseId, material)}
                    icon={<TaskProgressIcon status="open" />}
                    iconVariant="plain"
                    key={material.id}
                    meta={material.sectionName ?? "Aufgabenblatt"}
                    title={material.name}
                    onOpen={() => onOpenMaterial(material)}
                  />
                ))}
              </CoursePreviewGrid>
            ) : (
              materialsReady ? <CoursePreviewBlankGrid /> : <CoursePreviewSkeletonGrid />
            )}
          </CourseOverviewSection>

          <CourseOverviewSection
            icon={<CalendarDays aria-hidden className="size-4 text-muted-foreground" />}
            onOpen={onOpenCalendar}
            title="Kalender"
          >
            {calendarLoading && courseEvents.length === 0 ? (
              <ListLoading label="Termine laden" />
            ) : calendarError && courseEvents.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">{calendarError}</p>
            ) : courseEvents.length > 0 ? (
              <div className="flex flex-col gap-1">
                {courseEvents.map((event) => (
                  <CoursePreviewButton
                    icon={<CalendarDays aria-hidden className="size-4" />}
                    key={event.uid || `${event.start}-${event.summary}`}
                    meta={formatEventTime(event.start, event.end)}
                    title={event.summary}
                    onOpen={() => onOpenEvent(event.uid)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Keine kommenden Termine für diesen Kurs.</p>
            )}
          </CourseOverviewSection>

          <CourseOverviewSection
            icon={<MessageSquare aria-hidden className="size-4 text-muted-foreground" />}
            onOpen={onNewChat}
            title="Chat"
          >
            {recentChats.length > 0 ? (
              <div className="flex flex-col gap-1">
                {recentChats.map((chat) => (
                  <CoursePreviewButton
                    icon={<MessageSquare aria-hidden className="size-4" />}
                    key={chat.id}
                    meta={formatChatTime(chat.updatedAt)}
                    title={chat.title}
                    onOpen={() => onOpenChat(chat)}
                  />
                ))}
              </div>
            ) : (
              <button
                className="min-h-11 w-fit rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                onClick={onNewChat}
                type="button"
              >
                Neuer Chat
              </button>
            )}
          </CourseOverviewSection>

          {showRecordingsPreview ? (
            <CourseOverviewSection
              icon={<Video aria-hidden className="size-4 text-muted-foreground" />}
              onOpen={() => onSelectMode("recordings")}
              title="Aufzeichnungen"
            >
              {recordingsState?.loading && recordings.length === 0 ? (
                <ListLoading label="Aufzeichnungen laden" />
              ) : recordingsState?.error && recordings.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">{recordingsState.error}</p>
              ) : recordings.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {recordings.map((recording) => (
                    <CoursePreviewButton
                      icon={<Video aria-hidden className="size-4" />}
                      key={recording.recordingUuid}
                      meta={formatRecordingDate(recording.recordingDate)}
                      title={recording.sessionTitle || recording.recordingName}
                      onOpen={() => onOpenRecording(recording.recordingUuid)}
                    />
                  ))}
                </div>
              ) : (
                <p className="px-1 text-sm text-muted-foreground">Keine Aufzeichnungen gefunden.</p>
              )}
            </CourseOverviewSection>
          ) : null}

          <section className="flex flex-col gap-3">
            <p className="px-1 text-base font-semibold tracking-tight">Weitere Bereiche</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {secondaryModeItems.map((item) => {
                const presentation = courseModePresentation(item);
                return (
                  <button
                    className="flex min-h-14 items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                    key={item.mode}
                    onClick={() => onSelectMode(item.mode)}
                    type="button"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background">
                      <item.icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{presentation.label}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>

          <div>
            <StudyPipelineAction courseId={courseId} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CourseOverviewSection({
  children,
  icon,
  onOpen,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onOpen?: () => void;
  title: string;
}) {
  const heading = (
    <span className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight">
      {icon}
      <span className="truncate">{title}</span>
      {onOpen ? <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="px-1">
        {onOpen ? (
          <button
            className="flex max-w-full items-center text-foreground transition-colors hover:text-muted-foreground"
            onClick={onOpen}
            type="button"
          >
            {heading}
          </button>
        ) : (
          heading
        )}
      </div>
      {children}
    </section>
  );
}

function CoursePreviewButton({
  href,
  icon,
  iconVariant = "badge",
  meta,
  onOpen,
  title,
}: {
  href?: string;
  icon?: React.ReactNode;
  iconVariant?: "badge" | "plain";
  meta?: string;
  onOpen: () => void;
  title: string;
}) {
  const className = "flex h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-secondary";
  const content = (
    <>
      {icon ? (
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center text-muted-foreground",
            iconVariant === "badge" && "rounded-full bg-secondary",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-1 text-sm font-semibold leading-snug">{title}</span>
        {meta ? <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">{meta}</span> : null}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        className={className}
        href={href}
        onClick={(event) => {
          if (!shouldHandleAppLinkClick(event)) {
            return;
          }
          event.preventDefault();
          onOpen();
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={className}
      onClick={onOpen}
      type="button"
    >
      {content}
    </button>
  );
}

function materialHref(courseId: string, material: Material): string {
  return buildNavigatorURL(openDocument(homeState(), {
    kind: "material",
    courseId,
    materialId: material.id,
  }));
}

function TaskProgressIcon({ status }: { status: string }) {
  return isDoneTaskStatus(status)
    ? <CheckCircle2 aria-hidden className="size-5 text-emerald-500" />
    : <Circle aria-hidden className="size-5" />;
}

function CoursePreviewGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid h-[13.5rem] grid-cols-1 grid-rows-4 gap-2 sm:h-[6.5rem] sm:grid-cols-2 sm:grid-rows-2"
    >
      {children}
    </div>
  );
}

function CoursePreviewSkeletonGrid() {
  return (
    <CoursePreviewGrid>
      {Array.from({ length: COURSE_PREVIEW_SLOT_COUNT }, (_, index) => (
        <div className="flex h-12 items-center gap-3 rounded-2xl px-3 py-2.5" key={index}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </span>
        </div>
      ))}
    </CoursePreviewGrid>
  );
}

function CoursePreviewBlankGrid() {
  return (
    <CoursePreviewGrid>
      {Array.from({ length: COURSE_PREVIEW_SLOT_COUNT }, (_, index) => (
        <div className="h-12" key={index} />
      ))}
    </CoursePreviewGrid>
  );
}

function courseModePresentation(item: CourseModeItem): { label: string } {
  if (item.mode === "script") {
    return { label: item.label };
  }
  if (item.mode === "formula") {
    return { label: item.description };
  }
  if (item.mode === "recordings") {
    return { label: "Aufzeichnungen" };
  }
  return { label: item.label };
}

function compareMaterialsByRecency(left: Material, right: Material): number {
  const leftDate = Date.parse(left.uploadedAt ?? "");
  const rightDate = Date.parse(right.uploadedAt ?? "");
  if (!Number.isNaN(leftDate) || !Number.isNaN(rightDate)) {
    return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
  }
  return 0;
}

function compareRecordingsByDate(left: { recordingDate: string }, right: { recordingDate: string }): number {
  const leftDate = Date.parse(left.recordingDate);
  const rightDate = Date.parse(right.recordingDate);
  return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
}

function formatRecordingDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Aufzeichnung";
  }
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function isDoneTaskStatus(status: string): boolean {
  return status === "done" || status === "correct";
}

function isTaskMaterial(material: Material): boolean {
  return /aufgabenblatt\s*\d+|assignment|exercise/i.test(material.name) && !/lösung|loesung|solution/i.test(material.name);
}

function isPdfMaterial(material: Material): boolean {
  const candidates = [material.fileType, material.type, material.name, material.url].filter(Boolean).join(" ");
  return /\.pdf(\?|#|$)/i.test(candidates) || /\bpdf\b|aufgabenblatt|lösung|loesung|folien|slides/i.test(candidates);
}

function relevantCourseEvents(events: CalendarEventSummary[], course: Course): CalendarEventSummary[] {
  const title = normalizeCourseMatchText(courseTitle(course));
  const subtitle = normalizeCourseMatchText(courseSubtitle(course));
  return events.filter((event) => {
    const eventCourse = normalizeCourseMatchText(event.courseName ?? "");
    if (!eventCourse) {
      return false;
    }
    return eventCourse === title || eventCourse === subtitle || title.includes(eventCourse) || eventCourse.includes(title);
  });
}

function normalizeCourseMatchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
    const refresh = () => setSessions(readRecentChats());
    refresh();
    return subscribeRecentChats(refresh);
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

export function formatChatTime(value: string): string {
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
