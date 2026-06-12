import { auth } from "@clerk/nextjs/server";

import { fetchParsedCalendarEvents } from "@/lib/ical-calendar";
import { extractCalendarUrlFromSettings, isLikelyCalendarUrl } from "@/lib/calendar-subscription";
import { MOODLE_SERVICES_URL, moodleInternalHeaders, readServiceJSON } from "@/lib/moodle-services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { days?: number; url?: string } | null;
  const suppliedUrl = body?.url?.trim() ?? "";
  const savedUrl = suppliedUrl ? null : await readSavedCalendarUrl(userId);
  const url = suppliedUrl || savedUrl || "";
  if (!url) {
    return Response.json({ error: "Calendar URL is not configured." }, { status: 400 });
  }
  if (!isLikelyCalendarUrl(url)) {
    return Response.json({ error: "A valid calendar URL is required." }, { status: 400 });
  }

  const days = typeof body?.days === "number" && body.days > 0 ? Math.min(body.days, 120) : 120;

  try {
    const events = await fetchParsedCalendarEvents(url, days);
    return Response.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load calendar feed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

async function readSavedCalendarUrl(userId: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(`${MOODLE_SERVICES_URL}/api/user/settings`, {
      method: "GET",
      cache: "no-store",
      headers: moodleInternalHeaders(userId),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = await readServiceJSON<{ settings?: unknown }>(response);
  return extractCalendarUrlFromSettings(payload.settings);
}
