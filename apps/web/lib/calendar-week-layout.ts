import { localDayKey } from "@/lib/calendar-grid";

export type CalendarWeekEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

export const HOUR_HEIGHT_PX = 48;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const MIN_EVENT_MINUTES = 30;

export type PositionedWeekEvent = {
  column: number;
  columnCount: number;
  dayKey: string;
  event: CalendarWeekEvent;
  heightPx: number;
  topPx: number;
};

type TimedSlice = {
  bottomPx: number;
  column: number;
  columnCount: number;
  dayKey: string;
  event: CalendarWeekEvent;
  heightPx: number;
  topPx: number;
};

export function eventDayKey(event: CalendarWeekEvent): string {
  const date = parseEventDate(event.start);
  return date ? localDayKey(date) : "";
}

export function isAllDayEvent(event: CalendarWeekEvent): boolean {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  if (!start || !end) {
    return false;
  }
  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  return startsAtMidnight && durationHours >= 23;
}

export function computeGridHours(events: CalendarWeekEvent[], dayKeys: readonly string[]): { endHour: number; startHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const event of events) {
    const dayKey = eventDayKey(event);
    if (!dayKeys.includes(dayKey) || isAllDayEvent(event)) {
      continue;
    }
    const start = parseEventDate(event.start);
    const end = parseEventDate(event.end);
    if (!start || !end) {
      continue;
    }
    startHour = Math.min(startHour, Math.floor(minutesFromMidnight(start) / 60));
    endHour = Math.max(endHour, Math.ceil(minutesFromMidnight(end) / 60));
  }

  return {
    startHour: Math.max(0, startHour - 1),
    endHour: Math.min(24, Math.max(endHour + 1, startHour + 4)),
  };
}

export function layoutWeekEvents(
  events: CalendarWeekEvent[],
  dayKeys: readonly string[],
  startHour: number,
  hourHeight: number,
): PositionedWeekEvent[] {
  const positioned: PositionedWeekEvent[] = [];

  for (const dayKey of dayKeys) {
    const slices = events
      .filter((event) => eventDayKey(event) === dayKey && !isAllDayEvent(event))
      .map((event) => toTimedSlice(event, dayKey, startHour, hourHeight))
      .filter((slice): slice is TimedSlice => slice !== null)
      .sort((left, right) => left.topPx - right.topPx);

    assignOverlapColumns(slices);
    positioned.push(...slices);
  }

  return positioned;
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function toTimedSlice(
  event: CalendarWeekEvent,
  dayKey: string,
  startHour: number,
  hourHeight: number,
): TimedSlice | null {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  if (!start) {
    return null;
  }

  const startMinutes = minutesFromMidnight(start);
  const endMinutes = end ? Math.max(minutesFromMidnight(end), startMinutes + MIN_EVENT_MINUTES) : startMinutes + MIN_EVENT_MINUTES;
  const topPx = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const heightPx = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 28);

  return {
    event,
    dayKey,
    topPx,
    heightPx,
    bottomPx: topPx + heightPx,
    column: 0,
    columnCount: 1,
  };
}

function assignOverlapColumns(slices: TimedSlice[]): void {
  const groups: TimedSlice[][] = [];
  let group: TimedSlice[] = [];
  let groupEnd = 0;

  for (const slice of slices) {
    if (group.length === 0 || slice.topPx < groupEnd) {
      group.push(slice);
      groupEnd = Math.max(groupEnd, slice.bottomPx);
      continue;
    }
    groups.push(group);
    group = [slice];
    groupEnd = slice.bottomPx;
  }

  if (group.length > 0) {
    groups.push(group);
  }

  for (const overlapGroup of groups) {
    const columns: TimedSlice[][] = [];
    for (const slice of overlapGroup) {
      let columnIndex = 0;
      while (columnIndex < columns.length && !canPlaceInColumn(columns[columnIndex], slice)) {
        columnIndex += 1;
      }
      if (!columns[columnIndex]) {
        columns[columnIndex] = [];
      }
      columns[columnIndex].push(slice);
      slice.column = columnIndex;
    }

    const columnCount = columns.length;
    for (const slice of overlapGroup) {
      slice.columnCount = columnCount;
    }
  }
}

function canPlaceInColumn(column: TimedSlice[], slice: TimedSlice): boolean {
  return column.every((other) => other.bottomPx <= slice.topPx || slice.bottomPx <= other.topPx);
}

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
