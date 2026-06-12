const CALENDAR_URL_KEY = "moodle-clients.calendar-url.v1";

export function readStoredCalendarUrl(ownerId?: string | null): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(calendarStorageKey(ownerId))?.trim();
  return value ? value : null;
}

export function writeStoredCalendarUrl(url: string, ownerId?: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(calendarStorageKey(ownerId), url.trim());
}

export function clearStoredCalendarUrl(ownerId?: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(calendarStorageKey(ownerId));
}

function calendarStorageKey(ownerId?: string | null): string {
  return ownerId ? `${CALENDAR_URL_KEY}.${ownerId}` : CALENDAR_URL_KEY;
}
