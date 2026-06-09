"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarEventDetail } from "@/components/calendar-views";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WEEKDAY_LABELS, type CalendarGridDay } from "@/lib/calendar-grid";
import {
  HOUR_HEIGHT_PX,
  computeGridHours,
  eventDayKey,
  isAllDayEvent,
  layoutWeekEvents,
  type CalendarWeekEvent,
} from "@/lib/calendar-week-layout";
import { eventColorClasses } from "@/lib/calendar-event-colors";
import { cn } from "@/lib/utils";

export function WeekTimeGrid({
  days,
  events,
  onSelectDay,
}: {
  days: CalendarGridDay[];
  events: CalendarWeekEvent[];
  onSelectDay: (dayKey: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarWeekEvent | null>(null);
  const dayKeys = useMemo(() => days.map((day) => day.key), [days]);

  const weekEvents = useMemo(
    () => events.filter((event) => dayKeys.includes(eventDayKey(event))),
    [dayKeys, events],
  );

  const allDayEvents = useMemo(() => weekEvents.filter(isAllDayEvent), [weekEvents]);
  const timedEvents = useMemo(() => weekEvents.filter((event) => !isAllDayEvent(event)), [weekEvents]);

  const { startHour, endHour } = useMemo(
    () => computeGridHours(timedEvents, dayKeys),
    [dayKeys, timedEvents],
  );

  const hourLabels = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
    [endHour, startHour],
  );

  const gridHeight = (endHour - startHour) * HOUR_HEIGHT_PX;

  const positionedEvents = useMemo(
    () => layoutWeekEvents(timedEvents, dayKeys, startHour, HOUR_HEIGHT_PX),
    [dayKeys, startHour, timedEvents],
  );

  const nowLine = useMemo(() => {
    const todayKey = dayKeys.find((_, index) => days[index]?.today);
    if (!todayKey) {
      return null;
    }
    const now = new Date();
    const topPx = ((now.getHours() * 60 + now.getMinutes() - startHour * 60) / 60) * HOUR_HEIGHT_PX;
    if (topPx < 0 || topPx > gridHeight) {
      return null;
    }
    return { dayKey: todayKey, topPx };
  }, [dayKeys, days, gridHeight, startHour]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    const targetTop = nowLine?.topPx ?? Math.max(0, (9 - startHour) * HOUR_HEIGHT_PX);
    node.scrollTop = Math.max(0, targetTop - node.clientHeight * 0.25);
  }, [nowLine?.topPx, startHour, dayKeys.join(",")]);

  return (
    <>
      <div className="overflow-hidden border-y border-border/50">
        <div className="grid border-b border-border/50" style={{ gridTemplateColumns: "3.25rem repeat(7, minmax(0, 1fr))" }}>
          <div aria-hidden className="border-r border-border/40" />
          {days.map((day, index) => (
            <button
              key={day.key}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r border-border/40 px-1 py-2.5 text-center transition-colors last:border-r-0",
                day.selected ? "bg-muted/30" : "hover:bg-muted/20",
              )}
              type="button"
              onClick={() => onSelectDay(day.key)}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_LABELS[index]}
              </span>
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  day.today ? "bg-foreground text-background" : "",
                )}
              >
                {day.label}
              </span>
            </button>
          ))}
        </div>

        {allDayEvents.length > 0 ? (
          <div className="grid border-b border-border/60" style={{ gridTemplateColumns: "3.25rem repeat(7, minmax(0, 1fr))" }}>
            <div className="border-r border-border/40 px-1 py-2 text-right text-[10px] text-muted-foreground">Ganz</div>
            {days.map((day) => {
              const dayEvents = allDayEvents.filter((event) => eventDayKey(event) === day.key);
              return (
                <div key={day.key} className="space-y-1 border-r border-border/40 p-1 last:border-r-0">
                  {dayEvents.map((event) => {
                    const colors = eventColorClasses(event.uid || event.summary);
                    return (
                      <button
                        key={event.uid}
                        className={cn(
                          "w-full truncate rounded-full px-2 py-1 text-left text-[11px] font-medium text-white",
                          colors.card,
                        )}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                      >
                        {event.summary}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : null}

        <div ref={scrollRef} className="max-h-[min(70dvh,36rem)] overflow-y-auto overflow-x-hidden">
          <div className="grid" style={{ gridTemplateColumns: "3.25rem repeat(7, minmax(0, 1fr))" }}>
            <div className="relative border-r border-border/40" style={{ height: gridHeight }}>
              {hourLabels.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: (hour - startHour) * HOUR_HEIGHT_PX }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "relative border-r border-border/40 last:border-r-0",
                  day.selected ? "bg-muted/15" : "",
                )}
                style={{ height: gridHeight }}
              >
                {hourLabels.map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/25"
                    style={{ top: (hour - startHour) * HOUR_HEIGHT_PX }}
                  />
                ))}

                {nowLine?.dayKey === day.key ? (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowLine.topPx }}>
                    <div className="absolute -left-1 size-2 -translate-y-1/2 rounded-full bg-destructive" />
                    <div className="h-px bg-destructive/70" />
                  </div>
                ) : null}

                {positionedEvents
                  .filter((item) => item.dayKey === day.key)
                  .map((item) => {
                    const colors = eventColorClasses(item.event.uid || item.event.summary);
                    return (
                      <button
                        key={item.event.uid}
                        className={cn(
                          "absolute z-10 flex flex-col justify-between gap-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-white shadow-sm",
                          colors.card,
                        )}
                        style={{
                          top: item.topPx,
                          height: item.heightPx,
                          left: `calc(${(item.column / item.columnCount) * 100}% + 2px)`,
                          width: `calc(${100 / item.columnCount}% - 4px)`,
                        }}
                        title={`${item.event.summary} · ${formatEventTime(item.event)}`}
                        type="button"
                        onClick={() => setSelectedEvent(item.event)}
                      >
                        <span
                          className={cn(
                            "min-h-0 text-[9px] font-semibold leading-tight",
                            item.heightPx >= 36 ? "line-clamp-2" : "line-clamp-1",
                          )}
                        >
                          {item.event.summary}
                        </span>
                        <span className={cn("shrink-0 text-[8px] leading-none tabular-nums", colors.time)}>
                          {formatEventTime(item.event)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CalendarEventDialog
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      />
    </>
  );
}

function CalendarEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarWeekEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-3 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base leading-snug">{event.summary || "Termin"}</DialogTitle>
        </DialogHeader>
        <CalendarEventDetail event={event} showTitle={false} />
      </DialogContent>
    </Dialog>
  );
}

function formatHourLabel(hour: number): string {
  return new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(2000, 0, 1, hour, 0),
  );
}

function formatEventTime(event: CalendarWeekEvent): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const formatter = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" });
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  if (Number.isNaN(end.getTime())) {
    return formatter.format(start);
  }
  return `${formatter.format(start)}–${formatter.format(end)}`;
}
