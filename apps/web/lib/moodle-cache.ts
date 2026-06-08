import { createHash } from "node:crypto";

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
  void config;
  void userId;
  return { hit: false };
}

export async function writeMoodleCache(config: MoodleCacheConfig, userId: string, value: unknown): Promise<void> {
  void config;
  void userId;
  void value;
}

function ttlForPath(upstreamPath: string): number | null {
  if (upstreamPath === "me") return 60 * 60 * 6;
  if (upstreamPath === "courses") return 60 * 60 * 12;
  if (/^courses\/[^/]+\/materials$/.test(upstreamPath)) return 60 * 60 * 12;
  return null;
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 32);
}
