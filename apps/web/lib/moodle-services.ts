export const MOODLE_SERVICES_URL =
  process.env.MOODLE_SERVICES_URL ?? "https://moodle-services.os-home.net";

export function getMoodleInternalSecret(): string {
  const internalSecret = process.env.MOODLE_WEB_INTERNAL_SECRET;
  if (!internalSecret) {
    throw new Error("Moodle web connection secret is not configured.");
  }
  return internalSecret;
}

export async function readServiceJSON<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export function moodleInternalHeaders(clerkUserId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Clerk-User-Id": clerkUserId,
    "X-Moodle-Internal-Secret": getMoodleInternalSecret(),
  };
}

export function proxyServiceResponse(response: Response, fallbackContentType = "application/json; charset=utf-8"): Response {
  return new Response(response.body, {
    status: response.status,
    headers: {
      "cache-control": "no-store",
      "content-type": response.headers.get("content-type") ?? fallbackContentType,
    },
  });
}
