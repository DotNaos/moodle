export type BackendProfileMode = "local" | "live" | "custom";

export type BackendProfileEvidence = {
  mode: BackendProfileMode;
  servicesUrl: string;
  serviceKind: "local" | "live";
};

export type BackendProfileResult =
  | {
      ok: true;
      evidence: BackendProfileEvidence;
    }
  | {
      ok: false;
      code:
        | "backend_profile_invalid"
        | "backend_profile_mismatch"
        | "backend_internal_secret_missing"
        | "backend_profile_mixed_secret";
      error: string;
      status: number;
    };

const LOCAL_DEV_INTERNAL_SECRET = "local-moodle-dev-internal-secret";

type BackendProfileEnv = {
  MOODLE_BACKEND_PROFILE?: string;
  MOODLE_SERVICES_URL?: string;
  MOODLE_WEB_INTERNAL_SECRET?: string;
};

export function resolveBackendProfile(env: BackendProfileEnv = process.env as BackendProfileEnv): BackendProfileResult {
  const rawServicesUrl = env.MOODLE_SERVICES_URL ?? "https://moodle-services.os-home.net";
  let servicesUrl: URL;
  try {
    servicesUrl = new URL(rawServicesUrl);
  } catch {
    return {
      ok: false,
      code: "backend_profile_invalid",
      error: "Moodle backend URL is not a valid URL.",
      status: 500,
    };
  }

  if (servicesUrl.protocol !== "http:" && servicesUrl.protocol !== "https:") {
    return {
      ok: false,
      code: "backend_profile_invalid",
      error: "Moodle backend URL must use HTTP or HTTPS.",
      status: 500,
    };
  }

  const serviceKind = isLocalHost(servicesUrl.hostname) ? "local" : "live";
  const explicitProfile = normalizeProfile(env.MOODLE_BACKEND_PROFILE);
  if (env.MOODLE_BACKEND_PROFILE && !explicitProfile) {
    return {
      ok: false,
      code: "backend_profile_invalid",
      error: "MOODLE_BACKEND_PROFILE must be local, live, or custom.",
      status: 500,
    };
  }

  const mode = explicitProfile ?? serviceKind;
  if (mode === "local" && serviceKind !== "local") {
    return {
      ok: false,
      code: "backend_profile_mismatch",
      error: "Moodle backend profile is local, but the configured backend URL is not local.",
      status: 409,
    };
  }
  if (mode === "live" && serviceKind !== "live") {
    return {
      ok: false,
      code: "backend_profile_mismatch",
      error: "Moodle backend profile is live, but the configured backend URL is local.",
      status: 409,
    };
  }

  const internalSecret = env.MOODLE_WEB_INTERNAL_SECRET;
  if (!internalSecret) {
    return {
      ok: false,
      code: "backend_internal_secret_missing",
      error: "Moodle backend trust secret is not configured.",
      status: 500,
    };
  }

  if (serviceKind === "live" && internalSecret === LOCAL_DEV_INTERNAL_SECRET) {
    return {
      ok: false,
      code: "backend_profile_mixed_secret",
      error: "Live Moodle backend is configured with the local-only trust secret.",
      status: 409,
    };
  }

  return {
    ok: true,
    evidence: {
      mode,
      servicesUrl: servicesUrl.toString().replace(/\/$/, ""),
      serviceKind,
    },
  };
}

function normalizeProfile(value: string | undefined): BackendProfileMode | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "local" || normalized === "live" || normalized === "custom") {
    return normalized;
  }
  return null;
}

function isLocalHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}
