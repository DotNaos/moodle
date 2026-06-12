import { readStoredCalendarUrl, writeStoredCalendarUrl } from "@/lib/calendar-storage";

export type CalendarSubscriptionState = {
  configured: boolean;
  urlHint?: string;
  url?: string;
  saved?: boolean;
  source?: "user-settings" | "local";
};

export async function loadCalendarSubscription(ownerId?: string | null): Promise<CalendarSubscriptionState> {
  try {
    const settings = await readUserSettings();
    const settingsUrl = extractCalendarUrlFromSettings(settings);
    if (settingsUrl) {
      writeStoredCalendarUrl(settingsUrl, ownerId);
      return {
        configured: true,
        saved: true,
        source: "user-settings",
        url: settingsUrl,
        urlHint: calendarURLHint(settingsUrl),
      };
    }
    return { configured: false, saved: true, source: "user-settings" };
  } catch {
    if (!ownerId) {
      return { configured: false };
    }
    const storedUrl = readStoredCalendarUrl(ownerId);
    return storedUrl
      ? {
          configured: true,
          saved: false,
          source: "local",
          url: storedUrl,
          urlHint: calendarURLHint(storedUrl),
        }
      : { configured: false };
  }
}

export async function saveCalendarSubscription(
  url: string,
  ownerId?: string | null,
): Promise<CalendarSubscriptionState> {
  const nextUrl = url.trim();
  const settings = await readUserSettings();
  await writeUserSettings({
    ...settings,
    calendarUrl: nextUrl,
  });
  writeStoredCalendarUrl(nextUrl, ownerId);

  return {
    configured: true,
    saved: true,
    source: "user-settings",
    url: nextUrl,
    urlHint: calendarURLHint(nextUrl),
  };
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

export function extractCalendarUrlFromSettings(settings: unknown): string | null {
  if (!isRecord(settings) || typeof settings.calendarUrl !== "string") {
    return null;
  }
  const value = settings.calendarUrl.trim();
  return isLikelyCalendarUrl(value) ? value : null;
}

async function readUserSettings(): Promise<Record<string, unknown>> {
  const response = await fetch("/api/user/settings", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => ({}))) as { settings?: unknown; error?: unknown };

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Settings request failed with ${response.status}.`);
  }

  return isRecord(payload.settings) ? payload.settings : {};
}

async function writeUserSettings(settings: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/user/settings", {
    method: "PUT",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown };

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Settings request failed with ${response.status}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
