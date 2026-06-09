"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CalendarSubscriptionForm } from "@/components/calendar-subscription-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Course } from "@/lib/dashboard-data";
import { courseSubtitle, courseTitle } from "@/lib/dashboard-data";
import {
  addMonths,
  addWeeks,
  buildCalendarMonth,
  buildCalendarWeek,
  formatCalendarEventTimeLabel,
  formatMonthTitle,
  formatSelectedDayTitle,
  formatWeekTitle,
  localDayKey,
  parseDayKey,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LABELS,
  type CalendarGridEventPreview,
} from "@/lib/calendar-grid";
import { readStoredCalendarUrl } from "@/lib/calendar-storage";
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

type CalendarViewMode = "week" | "month";

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
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => localDayKey(new Date()));

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

  const eventsByDay = useMemo(() => buildEventsByDay(visibleEvents), [visibleEvents]);

  const gridDays = useMemo(() => {
    if (viewMode === "week") {
      return buildCalendarWeek(focusDate, eventsByDay, selectedDayKey);
    }
    return buildCalendarMonth(startOfMonth(focusDate), eventsByDay, selectedDayKey);
  }, [eventsByDay, focusDate, selectedDayKey, viewMode]);

  const selectedDayEvents = useMemo(
    () => visibleEvents.filter((event) => eventDayKey(event) === selectedDayKey),
    [selectedDayKey, visibleEvents],
  );

  const periodTitle = viewMode === "week" ? formatWeekTitle(focusDate) : formatMonthTitle(focusDate);

  async function loadCalendar() {
    setLoading(true);
    setError(null);
    try {
      const storedUrl = readStoredCalendarUrl();
      if (storedUrl) {
        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: storedUrl, days: 120 }),
        });
        const payload = (await response.json().catch(() => null)) as CalendarResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload?.error || `Calendar request failed with ${response.status}.`);
        }
        setEvents(payload.events ?? []);
        return;
      }

      const response = await apiRequest<CalendarResponse>("/courses?route=calendar&days=120");
      setEvents(response.events ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(
        message.toLowerCase().includes("calendar url is not configured")
          ? "Noch kein Kalender hinterlegt. Speichere oben deine iCal-URL von der Schule."
          : message,
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  function goToToday() {
    const today = new Date();
    setFocusDate(today);
    setSelectedDayKey(localDayKey(today));
  }

  function shiftPeriod(direction: -1 | 1) {
    setFocusDate((current) => (viewMode === "week" ? addWeeks(current, direction) : addMonths(current, direction)));
  }

  function selectDay(dayKey: string) {
    setSelectedDayKey(dayKey);
    const date = parseDayKey(dayKey);
    if (date) {
      setFocusDate(viewMode === "week" ? startOfWeek(date) : startOfMonth(date));
    }
  }

  if (scope === "course" && !course) {
    return (
      <CenteredCalendarShell compact={compact}>
        <EmptyCalendarState title="Kein Kurs ausgewählt" description="Wähle zuerst einen Kurs aus." />
      </CenteredCalendarShell>
    );
  }

  return (
    <CenteredCalendarShell compact={compact}>
      {!compact ? (
        <header className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <CalendarHeader course={course} loading={loading} onRefresh={loadCalendar} scope={scope} />
        </header>
      ) : null}

      <div className="flex flex-col gap-5">
        {scope === "all" ? <CalendarSubscriptionForm onSaved={loadCalendar} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button aria-label="Vorheriger Zeitraum" size="icon" type="button" variant="secondary" onClick={() => shiftPeriod(-1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <Button className="px-3" type="button" variant="secondary" onClick={goToToday}>
              Heute
            </Button>
            <Button aria-label="Nächster Zeitraum" size="icon" type="button" variant="secondary" onClick={() => shiftPeriod(1)}>
              <ChevronRight aria-hidden />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
              <Button
                className="h-8 rounded-full px-3"
                type="button"
                variant={viewMode === "week" ? "default" : "ghost"}
                onClick={() => setViewMode("week")}
              >
                Woche
              </Button>
              <Button
                className="h-8 rounded-full px-3"
                type="button"
                variant={viewMode === "month" ? "default" : "ghost"}
                onClick={() => setViewMode("month")}
              >
                Monat
              </Button>
            </div>
            {!compact ? (
              <Button disabled={loading} type="button" variant="secondary" onClick={() => void loadCalendar()}>
                {loading ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
                Aktualisieren
              </Button>
            ) : null}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold tracking-tight">{periodTitle}</h2>
          {loading ? (
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner aria-hidden />
              Kalender wird geladen
            </p>
          ) : null}
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <CalendarGrid days={gridDays} viewMode={viewMode} onSelectDay={selectDay} />

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{formatSelectedDayTitle(selectedDayKey)}</h3>
          {selectedDayEvents.length === 0 ? (
            <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Keine Termine an diesem Tag.
            </p>
          ) : (
            selectedDayEvents.map((event) => (
              <CalendarEventRow key={event.uid || `${event.start}-${event.summary}`} event={event} />
            ))
          )}
        </section>
      </div>
    </CenteredCalendarShell>
  );
}

export function CourseCalendarPanel({ course }: { course: Course | null }) {
  return <CalendarPanel course={course} scope="course" />;
}

function CenteredCalendarShell({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("flex min-h-0 flex-1 flex-col", compact ? "overflow-hidden" : "min-h-[60dvh] overflow-hidden rounded-[1.5rem] bg-card md:min-h-0 md:rounded-[2rem]")}>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1 md:px-2 md:py-2">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </div>
    </section>
  );
}

function CalendarGrid({
  days,
  viewMode,
  onSelectDay,
}: {
  days: ReturnType<typeof buildCalendarMonth>;
  viewMode: CalendarViewMode;
  onSelectDay: (dayKey: string) => void;
}) {
  const previewLimit = viewMode === "week" ? 4 : 2;

  return (
    <div className="rounded-3xl bg-secondary/40 p-3 md:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 py-1 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7 gap-1", viewMode === "week" ? "min-h-36" : "")}>
        {days.map((day) => (
          <button
            key={day.key}
            className={cn(
              "relative flex min-h-11 flex-col rounded-2xl border border-transparent bg-background px-1 py-2 text-sm text-foreground shadow-sm transition-colors",
              viewMode === "month" ? "items-center justify-start" : "items-start justify-start px-2",
              day.outsideRange && viewMode === "month" ? "text-muted-foreground" : "",
              day.today && !day.selected ? "border-border" : "",
              day.selected ? "border-primary bg-primary text-primary-foreground" : "hover:border-border",
              viewMode === "week" ? "min-h-32" : day.events.length > 0 ? "min-h-16" : "",
            )}
            type="button"
            onClick={() => onSelectDay(day.key)}
          >
            <span
              className={cn(
                "font-semibold tabular-nums",
                viewMode === "week" ? "text-base" : "mx-auto",
                day.selected ? "text-inherit" : "",
              )}
            >
              {day.label}
            </span>
            <div className={cn("mt-1 flex w-full flex-col gap-0.5", viewMode === "month" ? "px-0.5" : "")}>
              {day.events.slice(0, previewLimit).map((event) => (
                <CalendarGridEventChip key={event.id} day={day} event={event} viewMode={viewMode} />
              ))}
              {day.events.length > previewLimit ? (
                <span className={cn("px-1 text-[10px]", day.selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  +{day.events.length - previewLimit} weitere
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarGridEventChip({
  day,
  event,
  viewMode,
}: {
  day: ReturnType<typeof buildCalendarMonth>[number];
  event: CalendarGridEventPreview;
  viewMode: CalendarViewMode;
}) {
  return (
    <span
      className={cn(
        "w-full truncate rounded-md px-1 py-0.5 text-left text-[10px] leading-tight",
        day.selected ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background/85 text-foreground",
      )}
      title={event.summary}
    >
      {viewMode === "week" && event.timeLabel ? `${event.timeLabel} ` : null}
      {event.summary}
    </span>
  );
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
      <Button className="w-fit" disabled={loading} onClick={() => void onRefresh()} variant="secondary">
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
    <article className="flex flex-col gap-3 rounded-2xl bg-secondary px-4 py-3 sm:flex-row sm:items-start sm:gap-5">
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

function EmptyCalendarState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[28dvh] place-items-center text-center">
      <div className="max-w-sm">
        <CalendarDays className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden />
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function buildEventsByDay(events: CalendarEvent[]): Map<string, CalendarGridEventPreview[]> {
  const map = new Map<string, CalendarGridEventPreview[]>();
  for (const event of events) {
    const dayKey = eventDayKey(event);
    if (!dayKey) {
      continue;
    }
    const preview: CalendarGridEventPreview = {
      id: event.uid || `${event.start}-${event.summary}`,
      summary: event.summary || "Termin",
      timeLabel: formatCalendarEventTimeLabel(event.start, event.end),
    };
    map.set(dayKey, [...(map.get(dayKey) ?? []), preview]);
  }

  for (const [dayKey, dayEvents] of map.entries()) {
    map.set(
      dayKey,
      [...dayEvents].sort((left, right) => left.timeLabel.localeCompare(right.timeLabel, "de-CH", { numeric: true })),
    );
  }

  return map;
}

function eventDayKey(event: CalendarEvent): string {
  const date = parseEventDate(event.start);
  return date ? localDayKey(date) : "";
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

function cleanEventDescription(value: string | undefined): string {
  return (value ?? "").replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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
