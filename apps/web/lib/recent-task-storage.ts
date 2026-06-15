"use client";

// Tracks the tasks the user has recently opened, so the home overview can show
// "what you're currently working on". Mirrors recent-chat-storage.

export type RecentTaskEntry = {
  courseId: string;
  courseTitle?: string | null;
  id: string; // `${courseId}:${taskId}`
  taskId: string;
  title: string;
  updatedAt: string;
};

const RECENT_TASK_STORAGE_KEY = "moodle-clients.recent-tasks.v1";
const MAX_RECENT_TASKS = 12;

export function readRecentTasks(): RecentTaskEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_TASK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecentTaskEntry).sort(compareRecentTasks).slice(0, MAX_RECENT_TASKS);
  } catch {
    return [];
  }
}

export function upsertRecentTask(entry: RecentTaskEntry): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = readRecentTasks().filter((task) => task.id !== entry.id);
  const next = [entry, ...current].sort(compareRecentTasks).slice(0, MAX_RECENT_TASKS);
  window.localStorage.setItem(RECENT_TASK_STORAGE_KEY, JSON.stringify(next));
}

function compareRecentTasks(left: RecentTaskEntry, right: RecentTaskEntry): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function isRecentTaskEntry(value: unknown): value is RecentTaskEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.courseId === "string" &&
    typeof entry.taskId === "string" &&
    typeof entry.title === "string" &&
    typeof entry.updatedAt === "string"
  );
}
