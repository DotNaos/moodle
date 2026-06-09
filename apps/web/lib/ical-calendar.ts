export type ParsedCalendarEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
};

type RawCalendarEvent = Record<string, IcsProperty | undefined>;

type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

export async function fetchParsedCalendarEvents(url: string, days = 120): Promise<ParsedCalendarEvent[]> {
  const response = await fetch(url, {
    headers: {
      accept: "text/calendar,text/plain,*/*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Calendar feed failed with HTTP ${response.status}.`);
  }

  const events = parseCalendarText(await response.text());
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days + 1);

  return events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return end >= windowStart && start <= windowEnd;
  });
}

export function parseCalendarText(input: string): ParsedCalendarEvent[] {
  const events: ParsedCalendarEvent[] = [];
  let current: RawCalendarEvent | null = null;

  for (const line of unfoldLines(input)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
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

  return events.sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
}

function eventFromRaw(raw: RawCalendarEvent): ParsedCalendarEvent | null {
  const startProperty = raw.DTSTART;
  if (!startProperty) {
    return null;
  }

  const start = parseIcsDate(startProperty);
  if (!start) {
    return null;
  }

  const end = raw.DTEND ? parseIcsDate(raw.DTEND) : null;
  const uid = unescapeIcsText(raw.UID?.value ?? "");
  const summary = unescapeIcsText(raw.SUMMARY?.value ?? "").trim();
  const endIso = end?.iso ?? start.iso;

  return {
    uid: uid || `${start.iso}-${summary}`,
    summary: summary || "Termin",
    description: nullableText(raw.DESCRIPTION?.value) ?? undefined,
    location: nullableText(raw.LOCATION?.value) ?? undefined,
    start: start.iso,
    end: endIso,
  };
}

function parseIcsDate(property: IcsProperty): { iso: string; allDay: boolean } | null {
  const value = property.value.trim();
  const allDay = property.params.VALUE === "DATE" || /^\d{8}$/.test(value);

  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return {
      iso: new Date(year, month, day).toISOString(),
      allDay: true,
    };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "00", utc] = match;
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
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return { iso: date.toISOString(), allDay };
}

function parseProperty(line: string): IcsProperty | null {
  const separator = line.indexOf(":");
  if (separator < 1) {
    return null;
  }

  const nameAndParams = line.slice(0, separator);
  const parts = nameAndParams.split(";");
  const name = parts[0]?.trim().toUpperCase();
  if (!name) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey?.trim().toUpperCase();
    const value = rawValue.join("=").trim();
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
  for (const rawLine of input.replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (/^[ \t]/.test(line) && output.length > 0) {
      output[output.length - 1] += line.slice(1);
      continue;
    }
    output.push(line);
  }
  return output;
}

function nullableText(value: string | undefined): string | null {
  const text = unescapeIcsText(value ?? "").trim();
  return text || null;
}

function unescapeIcsText(value: string): string {
  return value
    .replaceAll(/\\n/gi, "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
}
