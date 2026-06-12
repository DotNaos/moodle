"use client";

import { Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  WEEKDAY_LABELS,
  type CalendarGridDay,
} from "@/lib/calendar-grid";
import { eventColorClasses } from "@/lib/calendar-event-colors";

type CalendarEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

export function MonthCalendarGrid({
  days,
  onSelectDay,
}: {
  days: CalendarGridDay[];
  onSelectDay: (dayKey: string) => void;
}) {
  return (
    <div className="overflow-hidden border-y border-border/50">
      <div className="grid grid-cols-7 border-b border-border/60">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <button
            key={day.key}
            className={cn(
              "relative flex min-h-[3.25rem] flex-col border-b border-r border-border/40 p-1.5 text-left transition-colors last:border-r-0",
              "hover:bg-background/60",
              day.outsideRange ? "text-muted-foreground/40" : "text-foreground",
              day.selected ? "bg-background" : "",
            )}
            type="button"
            onClick={() => onSelectDay(day.key)}
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                day.today && !day.selected ? "bg-foreground text-background font-semibold" : "font-medium",
                day.selected && !day.today ? "font-semibold" : "",
              )}
            >
              {day.label}
            </span>
            {day.events.length > 0 ? (
              <div className="mt-auto flex flex-wrap gap-0.5 pt-1">
                {day.events.slice(0, 3).map((event) => {
                  const colors = eventColorClasses(event.id);
                  return (
                    <span
                      key={event.id}
                      className={cn("size-1.5 rounded-full", colors.dot)}
                      title={event.summary}
                    />
                  );
                })}
                {day.events.length > 3 ? (
                  <span className="text-[9px] leading-none text-muted-foreground">+</span>
                ) : null}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CalendarEventDetail({
  event,
  showTitle = true,
}: {
  event: CalendarEvent;
  showTitle?: boolean;
}) {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const sameDay = start && end ? start.toDateString() === end.toDateString() : true;
  const description = cleanEventDescription(event.description);
  const hasWhenWhere = Boolean(start || event.location);

  return (
    <article className={cn("flex flex-col gap-4", showTitle ? "py-4" : "")}>
      {showTitle ? (
        <h3 className="text-base font-semibold tracking-tight">{event.summary || "Termin"}</h3>
      ) : null}

      {hasWhenWhere ? (
        <div className="rounded-2xl bg-muted/40 px-4 py-3">
          {start ? (
            <p className="text-sm font-medium">
              {formatWeekday(start)}, {formatDate(start)}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {start ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                {formatTimeRange(start, end, sameDay)}
              </span>
            ) : null}
            {event.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {event.location}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </article>
  );
}

function cleanEventDescription(value: string | undefined): string {
  return (value ?? "").replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", { weekday: "long" }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long" }).format(date);
}

function formatTimeRange(start: Date, end: Date | null, sameDay: boolean): string {
  const startText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(start);
  if (!end || !sameDay) {
    return startText;
  }
  const endText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(end);
  return `${startText}–${endText}`;
}
