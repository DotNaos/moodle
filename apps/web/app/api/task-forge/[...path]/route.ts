import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { decodeMoodleSession, encodeMoodleSession, MOODLE_SESSION_COOKIE } from "@/lib/moodle-session";
import { getMoodleInternalSecret, MOODLE_SERVICES_URL, readServiceJSON } from "@/lib/moodle-services";
import { getTaskForgeInternalSecret, taskForgeFetch, TASK_FORGE_URL } from "@/lib/task-forge";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request, context: RouteContext) {
  return proxyTaskForge(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyTaskForge(request, context);
}

async function proxyTaskForge(request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  let moodleSession = decodeMoodleSession(cookieStore.get(MOODLE_SESSION_COOKIE)?.value, userId);
  if (!moodleSession) {
    const restored = await restoreMoodleSession(userId);
    if (!restored.ok) {
      return moodleNotConnectedResponse(restored.error);
    }
    moodleSession = restored.session;
  }

  let taskForgeSecret: string;
  try {
    taskForgeSecret = getTaskForgeInternalSecret();
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }

  const params = await context.params;
  const upstreamPath = params.path?.map(encodeURIComponent).join("/") ?? "";
  const upstreamUrl = `${TASK_FORGE_URL}/api/${upstreamPath}${new URL(request.url).search}`;
  const body = request.method === "GET" ? undefined : await request.text();

  const upstreamResponse = await taskForgeFetch(upstreamUrl, {
    method: request.method,
    cache: "no-store",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      "X-Clerk-User-Id": userId,
      "X-Moodle-App-Key": moodleSession.apiKey,
      "X-Task-Forge-Internal-Secret": taskForgeSecret,
    },
    body,
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

type SessionRestorePayload = {
  user?: unknown;
  apiKey?: string;
  apiKeyRecord?: unknown;
  error?: string;
};

type SessionRestoreResult =
  | {
      ok: true;
      session: { clerkUserId: string; apiKey: string; createdAt: number };
    }
  | { ok: false; error?: string };

async function restoreMoodleSession(userId: string): Promise<SessionRestoreResult> {
  let internalSecret: string;
  try {
    internalSecret = getMoodleInternalSecret();
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }

  const upstreamResponse = await fetch(`${MOODLE_SERVICES_URL}/api/auth/clerk/session`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Clerk-User-Id": userId,
      "X-Moodle-Internal-Secret": internalSecret,
    },
    body: "{}",
  });

  const payload = await readServiceJSON<SessionRestorePayload>(upstreamResponse);
  if (!upstreamResponse.ok || !payload.apiKey) {
    return { ok: false, error: payload.error };
  }

  const session = {
    clerkUserId: userId,
    apiKey: payload.apiKey,
    createdAt: Date.now(),
  };
  const cookieStore = await cookies();
  cookieStore.set(MOODLE_SESSION_COOKIE, encodeMoodleSession(session), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true, session };
}

function moodleNotConnectedResponse(error?: string) {
  return Response.json(
    {
      code: "moodle_not_connected",
      error: error ?? "Connect your Moodle account first.",
    },
    { status: 409 },
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
