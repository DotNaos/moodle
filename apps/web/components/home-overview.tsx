"use client";

import { CalendarDays, ChevronRight, ListChecks, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";

import { CourseThumbnail, EmptyState, LoadingRows } from "@/components/dashboard-ui";
import { formatEventTime } from "@/components/navigator-panels";
import type { CalendarEventSummary } from "@/hooks/use-calendar-events";
import type { Course } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { readRecentChats, type RecentChatEntry } from "@/lib/recent-chat-storage";
import { readRecentTasks, type RecentTaskEntry } from "@/lib/recent-task-storage";

type CourseListGroup = {
  courses: Course[];
  key: string;
  label: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function HomeOverview({
  coursesLoading,
  courseListGroups,
  events,
  eventsError,
  eventsLoading,
  onOpenCalendar,
  onOpenChat,
  onOpenNewChat,
  onOpenCourses,
  onOpenEvent,
  onOpenTask,
  onSelectCourse,
}: {
  coursesLoading: boolean;
  courseListGroups: CourseListGroup[];
  events: CalendarEventSummary[];
  eventsError: string | null;
  eventsLoading: boolean;
  onOpenCalendar: () => void;
  onOpenChat: (sessionId: string, courseId: string | null) => void;
  onOpenNewChat: () => void;
  onOpenCourses: () => void;
  onOpenEvent: (eventUid: string) => void;
  onOpenTask: (courseId: string, taskId: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  // The first group is the most recent semester; treat it as "current".
  const currentGroup = courseListGroups[0] ?? null;

  const now = Date.now();
  const thisWeek = events
    .filter((event) => Date.parse(event.end ?? event.start) >= now)
    .filter((event) => Date.parse(event.start) <= now + WEEK_MS)
    .sort((left, right) => Date.parse(left.start) - Date.parse(right.start))
    .slice(0, 5);

  // Recent chats/tasks live in localStorage; read them after mount so SSR and
  // the first client render agree.
  const [recentTasks, setRecentTasks] = useState<RecentTaskEntry[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChatEntry[]>([]);
  useEffect(() => {
    setRecentTasks(readRecentTasks());
    setRecentChats(readRecentChats());
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-5 md:px-6 md:py-7">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{greeting()}</h1>

        {/* Aktuelles Semester — compact course tiles for the fastest jump back in. */}
        <HomeSection onOpen={onOpenCourses} title="Kurse">
          {coursesLoading && !currentGroup ? (
            <LoadingRows label="Kurse laden" />
          ) : currentGroup && currentGroup.courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {currentGroup.courses.map((course) => (
                <CourseQuickTile course={course} key={course.id} onSelect={() => onSelectCourse(String(course.id))} />
              ))}
            </div>
          ) : (
            <EmptyState description="Sobald deine Kurse geladen sind, erscheinen sie hier." title="Keine Kurse" />
          )}
        </HomeSection>

        {/* Kalender — this week's next few entries. */}
        <HomeSection
          icon={<CalendarDays aria-hidden className="size-4 text-muted-foreground" />}
          onOpen={onOpenCalendar}
          title="Kalender"
        >
          {eventsLoading && thisWeek.length === 0 ? (
            <LoadingRows label="Termine laden" />
          ) : eventsError && thisWeek.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">{eventsError}</p>
          ) : thisWeek.length > 0 ? (
            <div className="flex flex-col gap-1">
              {thisWeek.map((event) => (
                <EventRow
                  event={event}
                  key={event.uid || `${event.start}-${event.summary}`}
                  onOpen={() => onOpenEvent(event.uid)}
                />
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">Diese Woche stehen keine Termine an.</p>
          )}
        </HomeSection>

        {/* Aufgaben — the tasks the user has recently been working on. */}
        <HomeSection icon={<ListChecks aria-hidden className="size-4 text-muted-foreground" />} title="Aufgaben">
          {recentTasks.length > 0 ? (
            <div className="flex flex-col gap-1">
              {recentTasks.map((task) => (
                <RowButton
                  key={task.id}
                  subtitle={task.courseTitle ?? undefined}
                  title={task.title}
                  onOpen={() => onOpenTask(task.courseId, task.taskId)}
                />
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">Noch keine Aufgaben geöffnet.</p>
          )}
        </HomeSection>

        {/* Chats — recent AI chat sessions. */}
        <HomeSection
          icon={<MessagesSquare aria-hidden className="size-4 text-muted-foreground" />}
          onOpen={onOpenNewChat}
          title="Chat"
        >
          {recentChats.length > 0 ? (
            <div className="flex flex-col gap-1">
              {recentChats.map((chat) => (
                <RowButton
                  key={chat.id}
                  subtitle={chat.courseTitle ?? chat.preview}
                  title={chat.title}
                  onOpen={() => onOpenChat(chat.id, chat.courseId ?? null)}
                />
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">Noch keine Chats.</p>
          )}
        </HomeSection>
      </div>
    </section>
  );
}

function HomeSection({
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

function CourseQuickTile({ course, onSelect }: { course: Course; onSelect: () => void }) {
  return (
    <button
      className="flex min-w-0 items-center gap-3 rounded-xl bg-secondary/60 p-2 pr-3 text-left transition-colors hover:bg-secondary"
      onClick={onSelect}
      type="button"
    >
      <CourseThumbnail course={course} size="compact" />
      <span className="line-clamp-2 min-w-0 text-sm font-medium leading-snug">{courseTitle(course)}</span>
    </button>
  );
}

function EventRow({ event, onOpen }: { event: CalendarEventSummary; onOpen: () => void }) {
  return (
    <button
      className="w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-secondary"
      onClick={onOpen}
      type="button"
    >
      <p className="line-clamp-1 text-sm font-semibold leading-snug">{event.summary}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{formatEventTime(event.start, event.end)}</p>
      {event.courseName ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{event.courseName}</p>
      ) : null}
    </button>
  );
}

function RowButton({ onOpen, subtitle, title }: { onOpen: () => void; subtitle?: string; title: string }) {
  return (
    <button
      className="w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-secondary"
      onClick={onOpen}
      type="button"
    >
      <p className="line-clamp-1 text-sm font-semibold leading-snug">{title}</p>
      {subtitle ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p> : null}
    </button>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
}
