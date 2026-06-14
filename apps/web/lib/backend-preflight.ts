import {
  getMoodleInternalSecret,
  readServiceJSON,
} from "@/lib/moodle-services";
import {
  resolveBackendProfile,
  type BackendProfileEvidence,
} from "@/lib/backend-profile";

export type BackendPreflightState = "ready" | "needs_moodle_connect" | "blocked";

export type BackendPreflightResult = {
  state: BackendPreflightState;
  status: number;
  code: string;
  error?: string;
  backend?: BackendProfileEvidence;
  evidence: {
    backendProfileOk: boolean;
    backendHealthOk: boolean;
    backendTrustOk: boolean;
    moodleSessionOk: boolean;
  };
};

type SessionRestoreResponse = {
  apiKey?: string;
  code?: string;
  error?: string;
};

export async function checkBackendPreflight(clerkUserId: string): Promise<BackendPreflightResult> {
  const profile = resolveBackendProfile();
  if (!profile.ok) {
    return {
      state: "blocked",
      status: profile.status,
      code: profile.code,
      error: profile.error,
      evidence: {
        backendProfileOk: false,
        backendHealthOk: false,
        backendTrustOk: false,
        moodleSessionOk: false,
      },
    };
  }

  const backend = profile.evidence;
  const healthOk = await checkBackendHealth(backend.servicesUrl);
  if (!healthOk) {
    return {
      state: "blocked",
      status: 502,
      code: "backend_unreachable",
      error: "Moodle backend is not reachable.",
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: false,
        backendTrustOk: false,
        moodleSessionOk: false,
      },
    };
  }

  let internalSecret: string;
  try {
    internalSecret = getMoodleInternalSecret();
  } catch (error) {
    return {
      state: "blocked",
      status: 500,
      code: "backend_internal_secret_missing",
      error: getErrorMessage(error),
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: true,
        backendTrustOk: false,
        moodleSessionOk: false,
      },
    };
  }

  const sessionResponse = await fetch(`${backend.servicesUrl}/api/auth/clerk/session`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Clerk-User-Id": clerkUserId,
      "X-Moodle-Internal-Secret": internalSecret,
    },
  }).catch((error: unknown) => error);

  if (!(sessionResponse instanceof Response)) {
    return {
      state: "blocked",
      status: 502,
      code: "backend_session_check_failed",
      error: getErrorMessage(sessionResponse),
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: true,
        backendTrustOk: false,
        moodleSessionOk: false,
      },
    };
  }

  const payload = await readServiceJSON<SessionRestoreResponse>(sessionResponse);
  if (sessionResponse.status === 401 || sessionResponse.status === 403) {
    return {
      state: "blocked",
      status: 409,
      code: "backend_trust_failed",
      error: "Moodle backend rejected this frontend. Check the backend URL, profile, and trust secret.",
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: true,
        backendTrustOk: false,
        moodleSessionOk: false,
      },
    };
  }

  if (sessionResponse.status === 409 && payload.code === "moodle_not_connected") {
    return {
      state: "needs_moodle_connect",
      status: 200,
      code: "moodle_not_connected",
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: true,
        backendTrustOk: true,
        moodleSessionOk: false,
      },
    };
  }

  if (!sessionResponse.ok || !payload.apiKey) {
    return {
      state: "blocked",
      status: sessionResponse.status || 502,
      code: payload.code ?? "backend_session_check_failed",
      error: payload.error ?? "Moodle backend session could not be checked.",
      backend,
      evidence: {
        backendProfileOk: true,
        backendHealthOk: true,
        backendTrustOk: true,
        moodleSessionOk: false,
      },
    };
  }

  return {
    state: "ready",
    status: 200,
    code: "moodle_session_ready",
    backend,
    evidence: {
      backendProfileOk: true,
      backendHealthOk: true,
      backendTrustOk: true,
      moodleSessionOk: true,
    },
  };
}

export function backendPreflightResponse(result: BackendPreflightResult): Response {
  return Response.json(
    {
      state: result.state,
      code: result.code,
      error: result.error,
      backend: result.backend,
      evidence: result.evidence,
    },
    { status: result.status },
  );
}

async function checkBackendHealth(servicesUrl: string): Promise<boolean> {
  const response = await fetch(`${servicesUrl}/healthz`, {
    cache: "no-store",
  }).catch(() => null);
  return Boolean(response?.ok);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
