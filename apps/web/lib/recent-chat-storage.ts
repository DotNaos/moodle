"use client";

export type RecentChatEntry = {
  courseId?: string | null;
  courseTitle?: string | null;
  id: string;
  messageCount: number;
  preview: string;
  title: string;
  updatedAt: string;
};

const RECENT_CHAT_STORAGE_KEY = "moodle-clients.recent-chats.v1";
const MAX_RECENT_CHATS = 12;

export function readRecentChats(): RecentChatEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecentChatEntry).sort(compareRecentChats).slice(0, MAX_RECENT_CHATS);
  } catch {
    return [];
  }
}

export function upsertRecentChat(entry: RecentChatEntry): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = readRecentChats().filter((chat) => chat.id !== entry.id);
  const next = [entry, ...current].sort(compareRecentChats).slice(0, MAX_RECENT_CHATS);
  window.localStorage.setItem(RECENT_CHAT_STORAGE_KEY, JSON.stringify(next));
}

function compareRecentChats(left: RecentChatEntry, right: RecentChatEntry): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function isRecentChatEntry(value: unknown): value is RecentChatEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.preview === "string" &&
    typeof entry.updatedAt === "string" &&
    typeof entry.messageCount === "number"
  );
}
