type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return redirectLegacyTaskForge(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return redirectLegacyTaskForge(request, context);
}

async function redirectLegacyTaskForge(request: Request, context: RouteContext) {
  const params = await context.params;
  const nextPath = studyPipelinePath(params.path ?? []);
  if (!nextPath) {
    return Response.json(
      { error: "Task Forge is deprecated. Use Moodle study pipeline routes." },
      { status: 410, headers: { "cache-control": "no-store" } },
    );
  }

  const requestUrl = new URL(request.url);
  return redirectTo(`/api/moodle/${nextPath}${requestUrl.search}`);
}

function studyPipelinePath(parts: string[]): string | null {
  if (parts.length < 3 || parts[0] !== "courses") {
    return null;
  }

  const courseId = encodeURIComponent(parts[1]);
  const action = parts[2];

  if (action === "compile") {
    return `courses/${courseId}/study-pipeline/curated`;
  }
  if (action === "task-view") {
    return `courses/${courseId}/study-pipeline/task-view`;
  }
  if (action === "status") {
    return `courses/${courseId}/study-pipeline/status`;
  }
  if (action === "tasks" && parts.length >= 4) {
    return `courses/${courseId}/study-pipeline/${parts.slice(2).map(encodeURIComponent).join("/")}`;
  }

  return null;
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    headers: {
      "cache-control": "no-store",
      location,
    },
  });
}
