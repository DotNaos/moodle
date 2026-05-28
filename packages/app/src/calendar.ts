export type CalendarEvent = {
    readonly uid: string;
    readonly title: string;
    readonly startsAt: string;
    readonly endsAt: string | null;
    readonly location: string | null;
    readonly description: string | null;
    readonly allDay: boolean;
};

type RawCalendarEvent = Record<string, IcsProperty | undefined>;

type IcsProperty = {
    readonly name: string;
    readonly params: Record<string, string>;
    readonly value: string;
};

export async function fetchCalendarEvents(url: string): Promise<CalendarEvent[]> {
    const response = await fetch(url, {
        headers: {
            accept: 'text/calendar,text/plain,*/*',
        },
    });

    if (!response.ok) {
        throw new Error(`Calendar failed with HTTP ${response.status}.`);
    }

    return parseCalendar(await response.text());
}

export function parseCalendar(input: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    let current: RawCalendarEvent | null = null;

    for (const line of unfoldLines(input)) {
        if (line === 'BEGIN:VEVENT') {
            current = {};
            continue;
        }

        if (line === 'END:VEVENT') {
            if (current) {
                const event = eventFromRaw(current);
                if (event) {
                    events.push(event);
                }
            }
            current = null;
            continue;
        }

        if (!current) {
            continue;
        }

        const property = parseProperty(line);
        if (property) {
            current[property.name] = property;
        }
    }

    return events.sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
    );
}

export function upcomingCalendarEvents(
    events: readonly CalendarEvent[],
    now = new Date(),
): CalendarEvent[] {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const threshold = startOfToday.toISOString();

    return events.filter((event) => {
        const eventEnd = event.endsAt ?? event.startsAt;
        return eventEnd >= threshold;
    });
}

export function mergeConsecutiveCalendarEvents(
    events: readonly CalendarEvent[],
): CalendarEvent[] {
    const mergedEvents: CalendarEvent[] = [];

    for (const event of events) {
        const previous = mergedEvents.at(-1);
        if (!previous || !shouldMergeCalendarEvents(previous, event)) {
            mergedEvents.push(event);
            continue;
        }

        mergedEvents[mergedEvents.length - 1] = {
            ...previous,
            uid: `${previous.uid}+${event.uid}`,
            endsAt: laterCalendarTimestamp(
                previous.endsAt ?? previous.startsAt,
                event.endsAt ?? event.startsAt,
            ),
        };
    }

    return mergedEvents;
}

export function firstCalendarDayEvents(
    events: readonly CalendarEvent[],
): CalendarEvent[] {
    const firstEvent = events[0];
    if (!firstEvent) {
        return [];
    }

    const firstDay = calendarDayKey(firstEvent.startsAt);
    return events.filter((event) => calendarDayKey(event.startsAt) === firstDay);
}

export function getCalendarDayKey(value: string): string {
    return calendarDayKey(value);
}

export function formatCalendarDateRange(event: CalendarEvent): string {
    const startsAt = new Date(event.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
        return '';
    }

    if (event.allDay) {
        return new Intl.DateTimeFormat('de-CH', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
        }).format(startsAt);
    }

    const startDate = new Intl.DateTimeFormat('de-CH', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
    }).format(startsAt);
    const startTime = new Intl.DateTimeFormat('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(startsAt);

    if (!event.endsAt) {
        return `${startDate}, ${startTime}`;
    }

    const endsAt = new Date(event.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
        return `${startDate}, ${startTime}`;
    }

    const endTime = new Intl.DateTimeFormat('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(endsAt);

    return `${startDate}, ${startTime}-${endTime}`;
}

function shouldMergeCalendarEvents(
    previous: CalendarEvent,
    next: CalendarEvent,
): boolean {
    return (
        !previous.allDay &&
        !next.allDay &&
        normalizeCalendarTitle(previous.title) ===
            normalizeCalendarTitle(next.title) &&
        calendarDayKey(previous.startsAt) === calendarDayKey(next.startsAt)
    );
}

function normalizeCalendarTitle(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-CH');
}

function calendarDayKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.slice(0, 10);
    }

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function laterCalendarTimestamp(left: string, right: string): string {
    return left >= right ? left : right;
}

function eventFromRaw(raw: RawCalendarEvent): CalendarEvent | null {
    const startProperty = raw.DTSTART;
    if (!startProperty) {
        return null;
    }

    const start = parseIcsDate(startProperty);
    if (!start) {
        return null;
    }

    const end = raw.DTEND ? parseIcsDate(raw.DTEND) : null;
    const uid = unescapeIcsText(raw.UID?.value ?? '');
    const title = unescapeIcsText(raw.SUMMARY?.value ?? '').trim();

    return {
        uid: uid || `${start.iso}-${title}`,
        title: title || 'Untitled event',
        startsAt: start.iso,
        endsAt: end?.iso ?? null,
        location: nullableText(raw.LOCATION?.value),
        description: nullableText(raw.DESCRIPTION?.value),
        allDay: start.allDay,
    };
}

function parseIcsDate(property: IcsProperty): { iso: string; allDay: boolean } | null {
    const value = property.value.trim();
    const allDay = property.params.VALUE === 'DATE' || /^\d{8}$/.test(value);

    if (/^\d{8}$/.test(value)) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6)) - 1;
        const day = Number(value.slice(6, 8));
        return {
            iso: new Date(year, month, day).toISOString(),
            allDay: true,
        };
    }

    const match = value.match(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/,
    );
    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute, second = '00', utc] = match;
    const date = utc
        ? new Date(
              Date.UTC(
                  Number(year),
                  Number(month) - 1,
                  Number(day),
                  Number(hour),
                  Number(minute),
                  Number(second),
              ),
          )
        : new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              Number(hour),
              Number(minute),
              Number(second),
          );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return { iso: date.toISOString(), allDay };
}

function parseProperty(line: string): IcsProperty | null {
    const separator = line.indexOf(':');
    if (separator < 1) {
        return null;
    }

    const nameAndParams = line.slice(0, separator);
    const parts = nameAndParams.split(';');
    const name = parts[0]?.trim().toUpperCase();
    if (!name) {
        return null;
    }

    const params: Record<string, string> = {};
    for (const part of parts.slice(1)) {
        const [rawKey, ...rawValue] = part.split('=');
        const key = rawKey?.trim().toUpperCase();
        const value = rawValue.join('=').trim();
        if (key) {
            params[key] = value;
        }
    }

    return {
        name,
        params,
        value: line.slice(separator + 1),
    };
}

function unfoldLines(input: string): string[] {
    const output: string[] = [];
    for (const rawLine of input.replaceAll('\r\n', '\n').split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        if (/^[ \t]/.test(line) && output.length > 0) {
            output[output.length - 1] += line.slice(1);
            continue;
        }
        output.push(line);
    }
    return output;
}

function nullableText(value: string | undefined): string | null {
    const text = unescapeIcsText(value ?? '').trim();
    return text || null;
}

function unescapeIcsText(value: string): string {
    return value
        .replaceAll(/\\n/gi, '\n')
        .replaceAll('\\,', ',')
        .replaceAll('\\;', ';')
        .replaceAll('\\\\', '\\');
}
