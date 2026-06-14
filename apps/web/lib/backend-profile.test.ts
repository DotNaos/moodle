import { describe, expect, test } from "bun:test";

import { resolveBackendProfile } from "@/lib/backend-profile";

describe("backend profile", () => {
  test("accepts a local service with local profile", () => {
    const result = resolveBackendProfile({
      MOODLE_BACKEND_PROFILE: "local",
      MOODLE_SERVICES_URL: "http://127.0.0.1:8080",
      MOODLE_WEB_INTERNAL_SECRET: "local-moodle-dev-internal-secret",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evidence.mode).toBe("local");
      expect(result.evidence.serviceKind).toBe("local");
    }
  });

  test("blocks live backend with the local-only trust secret", () => {
    const result = resolveBackendProfile({
      MOODLE_SERVICES_URL: "https://moodle-services.os-home.net",
      MOODLE_WEB_INTERNAL_SECRET: "local-moodle-dev-internal-secret",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("backend_profile_mixed_secret");
    }
  });

  test("blocks explicit local profile against live URL", () => {
    const result = resolveBackendProfile({
      MOODLE_BACKEND_PROFILE: "local",
      MOODLE_SERVICES_URL: "https://moodle-services.os-home.net",
      MOODLE_WEB_INTERNAL_SECRET: "prod-secret",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("backend_profile_mismatch");
    }
  });

  test("blocks missing trust secret", () => {
    const result = resolveBackendProfile({
      MOODLE_SERVICES_URL: "http://localhost:8080",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("backend_internal_secret_missing");
    }
  });
});
