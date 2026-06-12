export type CalendarGridEventPreview = {
  id: string;
  summary: string;
  timeLabel: string;
};

export type CalendarGridDay = {
  events: CalendarGridEventPreview[];
  hasEvents: boolean;
  key: string;
  label: string;
  outsideRange: boolean;
  selected: boolean;
  today: boolean;
};

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export function localDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDayKey(dayKey: string): Date | null {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfWeek(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (normalized.getDay() + 6) % 7;
  return addDays(normalized, -offset);
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

export function buildCalendarMonth(
  visibleMonth: Date,
  eventsByDay: ReadonlyMap<string, CalendarGridEventPreview[]>,
  selectedDayKey: string,
): CalendarGridDay[] {
  const monthStart = startOfMonth(visibleMonth);
  const firstWeekdayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekdayOffset);
  const todayKey = localDayKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = localDayKey(date);
    const events = eventsByDay.get(key) ?? [];
    return {
      key,
      label: String(date.getDate()),
      outsideRange: date.getMonth() !== monthStart.getMonth(),
      today: key === todayKey,
      selected: key === selectedDayKey,
      hasEvents: events.length > 0,
      events,
    };
  });
}

export function buildCalendarWeek(
  focusDate: Date,
  eventsByDay: ReadonlyMap<string, CalendarGridEventPreview[]>,
  selectedDayKey: string,
): CalendarGridDay[] {
  const weekStart = startOfWeek(focusDate);
  const todayKey = localDayKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = localDayKey(date);
    const events = eventsByDay.get(key) ?? [];
    return {
      key,
      label: String(date.getDate()),
      outsideRange: false,
      today: key === todayKey,
      selected: key === selectedDayKey,
      hasEvents: events.length > 0,
      events,
    };
  });
}

export function formatMonthTitle(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" }).format(date);
}

export function formatWeekTitle(focusDate: Date): string {
  const weekStart = startOfWeek(focusDate);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(weekEnd);
  return `${startLabel} – ${endLabel}`;
}

export function formatSelectedDayTitle(dayKey: string): string {
  const date = parseDayKey(dayKey);
  if (!date) {
    return "Ausgewählter Tag";
  }

  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatCalendarEventTimeLabel(startValue: string, endValue?: string): string {
  const start = parseEventDate(startValue);
  if (!start) {
    return "";
  }
  const end = endValue ? parseEventDate(endValue) : null;
  const startText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(start);
  if (!end || start.toDateString() !== end.toDateString()) {
    return startText;
  }
  const endText = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(end);
  return `${startText}–${endText}`;
}

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
