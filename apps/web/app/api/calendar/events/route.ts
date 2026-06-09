import { auth } from "@clerk/nextjs/server";

import { fetchParsedCalendarEvents } from "@/lib/ical-calendar";
import { isLikelyCalendarUrl } from "@/lib/calendar-subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { days?: number; url?: string } | null;
  const url = body?.url?.trim() ?? "";
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
