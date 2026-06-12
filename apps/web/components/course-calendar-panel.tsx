"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Columns3, RefreshCw } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { CalendarEventDetail, MonthCalendarGrid } from "@/components/calendar-views";
import { WeekTimeGrid } from "@/components/calendar-week-grid";
import { CalendarSubscriptionSettings } from "@/components/calendar-subscription-form";
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
  type CalendarGridEventPreview,
} from "@/lib/calendar-grid";
import { loadCalendarSubscription } from "@/lib/calendar-subscription";
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
  const { userId } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => localDayKey(new Date()));

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subscription = await loadCalendarSubscription(userId);
      if (subscription.configured) {
        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: subscription.source === "local" ? subscription.url : undefined, days: 120 }),
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
          ? "Noch kein Kalender hinterlegt. Verbinde deine iCal-URL über das Link-Symbol."
          : message,
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (scope === "course" && !course) {
      setEvents([]);
      return;
    }
    void loadCalendar();
  }, [course?.id, loadCalendar, scope]);

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
      <CenteredCalendarShell compact={compact} wide={viewMode === "week"}>
        <EmptyCalendarState title="Kein Kurs ausgewählt" description="Wähle zuerst einen Kurs aus." />
      </CenteredCalendarShell>
    );
  }

  return (
    <CenteredCalendarShell compact={compact} wide={viewMode === "week"}>
      {!compact ? (
        <header className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <CalendarHeader course={course} loading={loading} onRefresh={loadCalendar} scope={scope} />
        </header>
      ) : null}

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Button aria-label="Vorheriger Zeitraum" size="icon-sm" type="button" variant="ghost" onClick={() => shiftPeriod(-1)}>
                <ChevronLeft aria-hidden />
              </Button>
              <Button className="px-2.5" size="sm" type="button" variant="ghost" onClick={goToToday}>
                Heute
              </Button>
              <Button aria-label="Nächster Zeitraum" size="icon-sm" type="button" variant="ghost" onClick={() => shiftPeriod(1)}>
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <h2 className="text-base font-semibold tracking-tight">{periodTitle}</h2>
            {loading ? <Spinner aria-hidden className="size-4 text-muted-foreground" /> : null}
          </div>

          <div className="flex items-center gap-2">
            {scope === "all" ? <CalendarSubscriptionSettings onSaved={loadCalendar} /> : null}
            <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5">
              <Button
                className="h-7 gap-1 rounded-full px-2.5 text-xs"
                size="sm"
                type="button"
                variant={viewMode === "week" ? "default" : "ghost"}
                onClick={() => setViewMode("week")}
              >
                <Columns3 aria-hidden className="size-3.5" />
                Woche
              </Button>
              <Button
                className="h-7 gap-1 rounded-full px-2.5 text-xs"
                size="sm"
                type="button"
                variant={viewMode === "month" ? "default" : "ghost"}
                onClick={() => setViewMode("month")}
              >
                <CalendarDays aria-hidden className="size-3.5" />
                Monat
              </Button>
            </div>
            {!compact ? (
              <Button disabled={loading} size="icon-sm" type="button" variant="ghost" onClick={() => void loadCalendar()}>
                {loading ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
              </Button>
            ) : null}
          </div>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        {viewMode === "week" ? (
          <WeekTimeGrid days={gridDays} events={visibleEvents} onSelectDay={selectDay} />
        ) : (
          <>
            <MonthCalendarGrid days={gridDays} onSelectDay={selectDay} />
            <section className="flex flex-col divide-y divide-border border-t border-border">
              <h3 className="pt-5 text-sm font-medium">{formatSelectedDayTitle(selectedDayKey)}</h3>
              {selectedDayEvents.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Keine Termine an diesem Tag.</p>
              ) : (
                selectedDayEvents.map((event) => (
                  <CalendarEventDetail key={event.uid || `${event.start}-${event.summary}`} event={event} />
                ))
              )}
            </section>
          </>
        )}
      </div>
    </CenteredCalendarShell>
  );
}

export function CourseCalendarPanel({ course }: { course: Course | null }) {
  return <CalendarPanel course={course} scope="course" />;
}

function CenteredCalendarShell({
  children,
  compact,
  wide = false,
}: {
  children: ReactNode;
  compact?: boolean;
  wide?: boolean;
}) {
  return (
    <section className={cn("flex min-h-0 flex-1 flex-col", compact ? "overflow-hidden" : "min-h-[60dvh] overflow-hidden rounded-[1.5rem] bg-card md:min-h-0 md:rounded-[2rem]")}>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1 md:px-2 md:py-2">
        <div className={cn("mx-auto w-full", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</div>
      </div>
    </section>
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

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
