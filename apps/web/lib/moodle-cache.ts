import { createHash } from "node:crypto";

import { getTaskForgeInternalSecret, taskForgeFetch, TASK_FORGE_URL } from "@/lib/task-forge";

type MoodleCacheConfig = {
  key: string;
  ttlSeconds: number;
};

type CacheReadResult =
  | { hit: true; value: unknown }
  | { hit: false };

export function getMoodleCacheConfig(userId: string, upstreamPath: string, searchParams: URLSearchParams): MoodleCacheConfig | null {
  if (searchParams.get("cache") === "reload") {
    return null;
  }

  const ttlSeconds = ttlForPath(upstreamPath);
  if (!ttlSeconds) {
    return null;
  }

  const normalizedSearch = new URLSearchParams(searchParams);
  normalizedSearch.delete("cache");
  normalizedSearch.sort();

  const userHash = hash(userId);
  const routeHash = hash(`${upstreamPath}?${normalizedSearch.toString()}`);
  return {
    key: `moodle:v1:${userHash}:${routeHash}`,
    ttlSeconds
  };
}

export async function readMoodleCache(config: MoodleCacheConfig, userId: string): Promise<CacheReadResult> {
  let secret: string;
  try {
    secret = getTaskForgeInternalSecret();
  } catch {
    return { hit: false };
  }

  try {
    const response = await taskForgeFetch(`${TASK_FORGE_URL}/api/cache?key=${encodeURIComponent(config.key)}`, {
      cache: "no-store",
      headers: cacheHeaders(userId, secret)
    });
    if (!response.ok) return { hit: false };
    const payload = await response.json() as { value?: unknown };
    return { hit: true, value: payload.value };
  } catch {
    return { hit: false };
  }
}

export async function writeMoodleCache(config: MoodleCacheConfig, userId: string, value: unknown): Promise<void> {
  let secret: string;
  try {
    secret = getTaskForgeInternalSecret();
  } catch {
    return;
  }

  try {
    await taskForgeFetch(`${TASK_FORGE_URL}/api/cache`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...cacheHeaders(userId, secret),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: config.key,
        ttlSeconds: config.ttlSeconds,
        value
      })
    });
  } catch {
    // The cache must never block the live Moodle path.
  }
}

function ttlForPath(upstreamPath: string): number | null {
  if (upstreamPath === "me") return 60 * 60 * 6;
  if (upstreamPath === "courses") return 60 * 60 * 12;
  if (/^courses\/[^/]+\/materials$/.test(upstreamPath)) return 60 * 60 * 12;
  return null;
}

function cacheHeaders(userId: string, secret: string): Record<string, string> {
  return {
    "X-Clerk-User-Id": userId,
    "X-Task-Forge-Internal-Secret": secret
  };
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 32);
}
