import { auth } from "@clerk/nextjs/server";

import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstreamResponse = await fetch(`${MOODLE_SERVICES_URL}/api/codex/models`, {
    cache: "no-store",
    headers: moodleInternalHeaders(userId),
  });

  return proxyServiceResponse(upstreamResponse);
}
