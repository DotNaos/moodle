import { auth } from "@clerk/nextjs/server";

import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return proxyServiceResponse(
    await fetch(`${MOODLE_SERVICES_URL}/api/user/settings`, {
      method: "GET",
      cache: "no-store",
      headers: moodleInternalHeaders(userId),
    }),
  );
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return proxyServiceResponse(
    await fetch(`${MOODLE_SERVICES_URL}/api/user/settings`, {
      method: "PUT",
      cache: "no-store",
      headers: moodleInternalHeaders(userId),
      body: await request.text(),
    }),
  );
}
