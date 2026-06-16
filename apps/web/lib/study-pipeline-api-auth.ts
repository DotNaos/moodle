export type StudyPipelineApiAuth = {
  apiKey: string;
  clerkUserId: string;
};

export function readStudyPipelineApiAuth(headers: Headers): StudyPipelineApiAuth | null {
  const apiKey = readMoodleAppKey(headers);
  if (!apiKey) return null;
  return {
    apiKey,
    clerkUserId: headers.get("x-clerk-user-id")?.trim() ?? "",
  };
}

export function readMoodleAppKey(headers: Headers): string {
  const headerKey = headers.get("x-moodle-app-key")?.trim();
  if (headerKey) return headerKey;

  const authorization = headers.get("authorization")?.trim() ?? "";
  const bearerMatch = /^bearer\s+(.+)$/i.exec(authorization);
  return bearerMatch?.[1]?.trim() ?? "";
}

export function studyPipelineApiAuthHeaders(auth: StudyPipelineApiAuth): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Moodle-App-Key": auth.apiKey,
  });
  if (auth.clerkUserId) {
    headers.set("X-Clerk-User-Id", auth.clerkUserId);
  }
  return headers;
}
