import { afterEach, describe, expect, test } from "bun:test";

import { checkBackendPreflight } from "@/lib/backend-preflight";

const originalFetch = globalThis.fetch;
const originalEnv = {
  MOODLE_BACKEND_PROFILE: process.env.MOODLE_BACKEND_PROFILE,
  MOODLE_SERVICES_URL: process.env.MOODLE_SERVICES_URL,
  MOODLE_WEB_INTERNAL_SECRET: process.env.MOODLE_WEB_INTERNAL_SECRET,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv();
});

describe("backend preflight", () => {
  test("blocks before network checks when the backend profile is invalid", async () => {
    process.env.MOODLE_SERVICES_URL = "https://moodle-services.os-home.net";
    process.env.MOODLE_WEB_INTERNAL_SECRET = "local-moodle-dev-internal-secret";

    const result = await checkBackendPreflight("user_1");

    expect(result.state).toBe("blocked");
    expect(result.code).toBe("backend_profile_mixed_secret");
    expect(result.evidence.backendProfileOk).toBe(false);
  });

  test("treats backend 401 as backend trust failure, not Moodle credential failure", async () => {
    process.env.MOODLE_SERVICES_URL = "http://127.0.0.1:8080";
    process.env.MOODLE_WEB_INTERNAL_SECRET = "local-moodle-dev-internal-secret";
    globalThis.fetch = mockFetch({
      healthStatus: 200,
      sessionStatus: 401,
      sessionPayload: { error: "Unauthorized" },
    });

    const result = await checkBackendPreflight("user_1");

    expect(result.state).toBe("blocked");
    expect(result.code).toBe("backend_trust_failed");
    expect(result.evidence.backendHealthOk).toBe(true);
    expect(result.evidence.backendTrustOk).toBe(false);
  });

  test("allows the connect form when backend trust is proven but Moodle is not connected", async () => {
    process.env.MOODLE_SERVICES_URL = "http://127.0.0.1:8080";
    process.env.MOODLE_WEB_INTERNAL_SECRET = "local-moodle-dev-internal-secret";
    globalThis.fetch = mockFetch({
      healthStatus: 200,
      sessionStatus: 409,
      sessionPayload: { code: "moodle_not_connected", error: "Connect Moodle first." },
    });

    const result = await checkBackendPreflight("user_1");

    expect(result.state).toBe("needs_moodle_connect");
    expect(result.evidence.backendTrustOk).toBe(true);
    expect(result.evidence.moodleSessionOk).toBe(false);
  });
});

function mockFetch({
  healthStatus,
  sessionPayload,
  sessionStatus,
}: {
  healthStatus: number;
  sessionPayload: unknown;
  sessionStatus: number;
}): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.endsWith("/healthz")) {
      return new Response("ok", { status: healthStatus });
    }
    return Response.json(sessionPayload, { status: sessionStatus });
  };
}

function restoreEnv() {
  restoreEnvValue("MOODLE_BACKEND_PROFILE", originalEnv.MOODLE_BACKEND_PROFILE);
  restoreEnvValue("MOODLE_SERVICES_URL", originalEnv.MOODLE_SERVICES_URL);
  restoreEnvValue("MOODLE_WEB_INTERNAL_SECRET", originalEnv.MOODLE_WEB_INTERNAL_SECRET);
}

function restoreEnvValue(key: keyof typeof originalEnv, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
