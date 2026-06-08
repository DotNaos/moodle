import { auth } from "@clerk/nextjs/server";

import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request, context: RouteContext) {
  return proxyStudyPipeline(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyStudyPipeline(request, context);
}

async function proxyStudyPipeline(request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const upstreamPath = params.path?.map(encodeURIComponent).join("/") ?? "";
  if (!isStudyPipelinePath(upstreamPath)) {
    return Response.json({ error: "Study pipeline route not found." }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${MOODLE_SERVICES_URL}/api/${upstreamPath}`);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers(moodleInternalHeaders(userId));
  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("accept", accept);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    cache: "no-store",
    headers,
    body: hasBody ? await request.text() : undefined,
  });

  return proxyServiceResponse(upstreamResponse);
}

function isStudyPipelinePath(path: string): boolean {
  const parts = path.split("/");
  return parts.length >= 3 && parts[0] === "courses" && parts[2] === "study-pipeline";
}
