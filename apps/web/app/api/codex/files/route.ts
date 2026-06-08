import { auth } from "@clerk/nextjs/server";

import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return proxyServiceResponse(await fetch(`${MOODLE_SERVICES_URL}/api/codex/files`, {
    method: "GET",
    cache: "no-store",
    headers: moodleInternalHeaders(userId),
  }));
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return proxyServiceResponse(await fetch(`${MOODLE_SERVICES_URL}/api/codex/files`, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...moodleInternalHeaders(userId),
      "Content-Type": "application/json",
    },
    body: await request.text(),
  }));
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  return proxyServiceResponse(await fetch(`${MOODLE_SERVICES_URL}/api/codex/files?name=${encodeURIComponent(url.searchParams.get("name") ?? "")}`, {
    method: "DELETE",
    cache: "no-store",
    headers: moodleInternalHeaders(userId),
  }));
}
