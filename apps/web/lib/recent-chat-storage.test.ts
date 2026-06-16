import { afterEach, describe, expect, test } from "bun:test";

import {
  readRecentChat,
  readRecentChats,
  subscribeRecentChats,
  upsertRecentChat,
} from "@/lib/recent-chat-storage";

describe("recent-chat-storage", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  test("stores and reads full chat transcripts", () => {
    installWindowMock();

    upsertRecentChat({
      id: "chat-1",
      courseId: "course-1",
      courseTitle: "Deep Learning",
      messageCount: 2,
      messages: [
        { id: "u1", role: "user", text: "Start?", toolEvents: [], actions: [], attachments: [] },
        { id: "a1", role: "assistant", text: "Start with the intro.", toolEvents: [], actions: [], attachments: [] },
      ],
      preview: "Start with the intro.",
      title: "Start?",
      updatedAt: "2026-06-16T15:00:00.000Z",
    });

    expect(readRecentChats()).toHaveLength(1);
    expect(readRecentChat("chat-1")?.messages?.map((message) => message.text)).toEqual([
      "Start?",
      "Start with the intro.",
    ]);
  });

  test("notifies subscribers when a chat changes", () => {
    installWindowMock();
    let calls = 0;
    const unsubscribe = subscribeRecentChats(() => {
      calls += 1;
    });

    upsertRecentChat({
      id: "chat-2",
      messageCount: 1,
      preview: "Preview",
      title: "Title",
      updatedAt: "2026-06-16T15:01:00.000Z",
    });

    unsubscribe();
    expect(calls).toBe(1);
  });
});

function installWindowMock() {
  const listeners = new Map<string, Set<() => void>>();
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: (name: string, listener: () => void) => {
        listeners.set(name, new Set([...(listeners.get(name) ?? []), listener]));
      },
      dispatchEvent: (event: Event) => {
        for (const listener of listeners.get(event.type) ?? []) {
          listener();
        }
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      removeEventListener: (name: string, listener: () => void) => {
        listeners.get(name)?.delete(listener);
      },
    },
  });
}
