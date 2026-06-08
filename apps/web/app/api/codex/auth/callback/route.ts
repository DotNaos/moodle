import { auth } from "@clerk/nextjs/server";

import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  const upstreamResponse = await fetch(`${MOODLE_SERVICES_URL}/api/codex/auth/callback`, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...moodleInternalHeaders(userId),
      "Content-Type": "application/json",
    },
    body,
  });

  return proxyServiceResponse(upstreamResponse);
}
