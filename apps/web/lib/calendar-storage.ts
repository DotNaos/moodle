const CALENDAR_URL_KEY = "moodle-clients.calendar-url.v1";

export function readStoredCalendarUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(CALENDAR_URL_KEY)?.trim();
  return value ? value : null;
}

export function writeStoredCalendarUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CALENDAR_URL_KEY, url.trim());
}

export function clearStoredCalendarUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CALENDAR_URL_KEY);
}
