"use client";

import type { CodexChatUIMessage } from "@/lib/codex-chat";

export type RecentChatEntry = {
  courseId?: string | null;
  courseTitle?: string | null;
  id: string;
  messages?: CodexChatUIMessage[];
  messageCount: number;
  preview: string;
  title: string;
  updatedAt: string;
};

const RECENT_CHAT_STORAGE_KEY = "moodle-clients.recent-chats.v1";
const RECENT_CHAT_UPDATED_EVENT = "moodle-clients:recent-chats-updated";
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

export function readRecentChat(id: string): RecentChatEntry | null {
  return readRecentChats().find((chat) => chat.id === id) ?? null;
}

export function subscribeRecentChats(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(RECENT_CHAT_UPDATED_EVENT, listener);
  return () => window.removeEventListener(RECENT_CHAT_UPDATED_EVENT, listener);
}

export function upsertRecentChat(entry: RecentChatEntry): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = readRecentChats().filter((chat) => chat.id !== entry.id);
  const next = [entry, ...current].sort(compareRecentChats).slice(0, MAX_RECENT_CHATS);
  window.localStorage.setItem(RECENT_CHAT_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENT_CHAT_UPDATED_EVENT));
}

function compareRecentChats(left: RecentChatEntry, right: RecentChatEntry): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function isRecentChatEntry(value: unknown): value is RecentChatEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  const validMessages = Array.isArray(entry.messages) ? entry.messages.filter(isChatMessage) : undefined;
  if (validMessages) {
    entry.messages = validMessages;
  }
  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.preview === "string" &&
    typeof entry.updatedAt === "string" &&
    typeof entry.messageCount === "number"
  );
}

function isChatMessage(value: unknown): value is CodexChatUIMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.id === "string" &&
    typeof message.text === "string" &&
    Array.isArray(message.toolEvents) &&
    Array.isArray(message.actions) &&
    Array.isArray(message.attachments)
  );
}
