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

const FHGR_STUDIUM_URL = "https://my.fhgr.ch/index.php?id=studium";
const FHGR_STUNDENPLAN_URL =
  "https://my.fhgr.ch/index.php?id=445&tx_fhgrlehre_studierendenportal%5Baction%5D=stundenplan&tx_fhgrlehre_studierendenportal%5Bcontroller%5D=Studierendenportal&cHash=44eabb034aa11d69854acc3585a002cd";

export function resolveFhgrCalendarHelpUrl(): string {
  if (!hasUserSpecificQuery(FHGR_STUNDENPLAN_URL)) {
    return FHGR_STUNDENPLAN_URL;
  }
  return FHGR_STUDIUM_URL;
}

function hasUserSpecificQuery(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has("cHash");
  } catch {
    return true;
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
