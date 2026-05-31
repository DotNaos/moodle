"use client";

import { CalendarDays, Clock, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Course } from "@/lib/dashboard-data";
import { courseSubtitle, courseTitle } from "@/lib/dashboard-data";
import { apiRequest, getErrorMessage } from "@/lib/moodle-api";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

type CalendarResponse = {
  events?: CalendarEvent[];
};

export function CalendarPanel({
  compact = false,
  course = null,
  scope = "all",
}: {
  compact?: boolean;
  course?: Course | null;
  scope?: "all" | "course";
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scope === "course" && !course) {
      setEvents([]);
      return;
    }
    void loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, scope]);

  const visibleEvents = useMemo(
    () => (scope === "course" ? matchCourseEvents(course, events) : sortEvents(events)),
    [course, events, scope],
  );

  async function loadCalendar() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<CalendarResponse>("/courses?route=calendar&days=120");
      setEvents(response.events ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={cn(
        "flex min-h-[60dvh] flex-col overflow-hidden",
        compact ? "min-h-0" : "rounded-[1.5rem] bg-card lg:min-h-0 lg:rounded-[2rem]",
      )}
    >
      {!compact ? (
        <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between lg:px-7">
          <CalendarHeader course={course} loading={loading} onRefresh={loadCalendar} scope={scope} />
        </header>
      ) : null}

      <div className={cn("min-h-0 flex-1 overflow-y-auto", compact ? "px-1 pb-4" : "px-5 py-5 lg:px-7")}>
        {error ? <Alert>{error}</Alert> : null}
        {scope === "course" && !course ? (
          <EmptyCalendarState title="Kein Kurs ausgewählt" description="Wähle zuerst einen Kurs aus." />
        ) : loading && events.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-hidden />
            Kalender wird geladen
          </div>
        ) : visibleEvents.length === 0 ? (
          <EmptyCalendarState
            title="Keine Termine gefunden"
            description={scope === "course" && course ? `Keine Termine für ${courseSubtitle(course)} erkannt.` : "Im aktuellen Zeitraum sind keine Moodle-Termine vorhanden."}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {visibleEvents.map((event) => (
              <CalendarEventRow key={event.uid || `${event.start}-${event.summary}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CourseCalendarPanel({ course }: { course: Course | null }) {
  return <CalendarPanel course={course} scope="course" />;
}

function CalendarHeader({
  course,
  loading,
  onRefresh,
  scope,
}: {
  course: Course | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  scope: "all" | "course";
}) {
  return (
    <>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">Kalender</h2>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {scope === "course" && course ? courseTitle(course) : "Alle Moodle-Termine"}
        </p>
      </div>
      <Button className="w-fit" disabled={scope === "course" && !course || loading} onClick={() => void onRefresh()} variant="secondary">
        {loading ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
        Aktualisieren
      </Button>
    </>
  );
}

function CalendarEventRow({ event }: { event: CalendarEvent }) {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const sameDay = start && end ? start.toDateString() === end.toDateString() : true;
  const description = cleanEventDescription(event.description);

  return (
    <article className="flex flex-col gap-3 border-b border-border px-1 py-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-5">
      <div className="w-full shrink-0 sm:w-28">
        <p className="text-sm font-semibold">{start ? formatDay(start) : "Termin"}</p>
        <p className="text-xs text-muted-foreground">{start ? formatDate(start) : ""}</p>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold tracking-tight">{event.summary || "Moodle-Termin"}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {start ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatTimeRange(start, end, sameDay)}
            </span>
          ) : null}
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </article>
  );
}

function cleanEventDescription(value: string | undefined): string {
  return (value ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function EmptyCalendarState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[28dvh] place-items-center text-center">
      <div className="max-w-sm">
        <CalendarDays className={cn("mx-auto mb-3 size-7 text-muted-foreground")} aria-hidden />
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function matchCourseEvents(course: Course | null, events: CalendarEvent[]): CalendarEvent[] {
  if (!course) {
    return [];
  }
  const tokens = courseMatchTokens(course);
  return events
    .filter((event) => {
      const haystack = normalizeText(`${event.summary} ${event.description ?? ""} ${event.location ?? ""}`);
      return tokens.some((token) => haystack.includes(token));
    })
    .sort(compareEvents);
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(compareEvents);
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  return new Date(left.start).getTime() - new Date(right.start).getTime();
}

function courseMatchTokens(course: Course): string[] {
  const title = courseTitle(course).replace(/\([^)]*\)/g, " ");
  const subtitle = courseSubtitle(course);
  const codeMatch = `${title} ${subtitle}`.match(/\b[a-z]{2,5}[-\s]?\d{2,4}\b/i);
  return [title, subtitle, codeMatch?.[0]]
    .filter((value): value is string => Boolean(value && value.trim().length >= 3))
    .map(normalizeText)
    .filter((value, index, list) => value.length >= 3 && list.indexOf(value) === index);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", { weekday: "short" }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatTimeRange(start: Date, end: Date | null, sameDay: boolean): string {
  const startText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(start);
  if (!end || !sameDay) {
    return startText;
  }
  const endText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(end);
  return `${startText} - ${endText}`;
}
