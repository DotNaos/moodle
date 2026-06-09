import { readStoredCalendarUrl, writeStoredCalendarUrl } from "@/lib/calendar-storage";
import { apiRequest } from "@/lib/moodle-api";

export type CalendarSubscriptionState = {
  configured: boolean;
  urlHint?: string;
  saved?: boolean;
};

export async function loadCalendarSubscription(): Promise<CalendarSubscriptionState> {
  const storedUrl = readStoredCalendarUrl();
  if (storedUrl) {
    return { configured: true, urlHint: calendarURLHint(storedUrl) };
  }

  try {
    return await apiRequest<CalendarSubscriptionState>("/courses?route=calendar-subscription");
  } catch {
    return { configured: false };
  }
}

export async function saveCalendarSubscription(url: string): Promise<CalendarSubscriptionState> {
  const nextUrl = url.trim();
  writeStoredCalendarUrl(nextUrl);

  try {
    const state = await apiRequest<CalendarSubscriptionState>("/courses?route=calendar-subscription", {
      method: "POST",
      body: JSON.stringify({ url: nextUrl }),
    });
    return { ...state, configured: true };
  } catch {
    return {
      configured: true,
      saved: true,
      urlHint: calendarURLHint(nextUrl),
    };
  }
}

export function isLikelyCalendarUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function calendarURLHint(value: string): string {
  try {
    const parsed = new URL(value.trim());
    const file = parsed.pathname.split("/").filter(Boolean).at(-1);
    return file ? `${parsed.host}/…/${file}` : parsed.host;
  } catch {
    return "";
  }
}
