import { describe, expect, test } from "bun:test";

import {
  readMoodleAppKey,
  readStudyPipelineApiAuth,
  studyPipelineApiAuthHeaders,
} from "@/lib/study-pipeline-api-auth";

describe("study pipeline API auth", () => {
  test("reads Moodle app keys from the explicit header", () => {
    const headers = new Headers({
      "X-Clerk-User-Id": "user_123",
      "X-Moodle-App-Key": "moodle_key",
    });

    expect(readStudyPipelineApiAuth(headers)).toEqual({
      apiKey: "moodle_key",
      clerkUserId: "user_123",
    });
  });

  test("reads Moodle app keys from bearer auth", () => {
    const headers = new Headers({ Authorization: "Bearer moodle_key" });

    expect(readMoodleAppKey(headers)).toBe("moodle_key");
  });

  test("does not invent auth without a key", () => {
    const headers = new Headers({ "X-Clerk-User-Id": "user_123" });

    expect(readStudyPipelineApiAuth(headers)).toBeNull();
  });

  test("builds proxy headers without leaking empty Clerk identity", () => {
    const headers = studyPipelineApiAuthHeaders({ apiKey: "moodle_key", clerkUserId: "" });

    expect(headers.get("X-Moodle-App-Key")).toBe("moodle_key");
    expect(headers.has("X-Clerk-User-Id")).toBe(false);
  });
});
