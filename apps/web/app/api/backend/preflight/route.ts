import { auth } from "@clerk/nextjs/server";

import {
  backendPreflightResponse,
  checkBackendPreflight,
} from "@/lib/backend-preflight";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      {
        state: "blocked",
        code: "app_session_missing",
        error: "Sign in before opening Moodle.",
        evidence: {
          backendProfileOk: false,
          backendHealthOk: false,
          backendTrustOk: false,
          moodleSessionOk: false,
        },
      },
      { status: 401 },
    );
  }

  return backendPreflightResponse(await checkBackendPreflight(userId));
}
