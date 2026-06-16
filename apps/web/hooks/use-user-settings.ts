"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@clerk/nextjs";
import type { CourseResourcesLayout } from "@/lib/material-display-preferences";
import type { MaterialTypeFilter } from "@/lib/material-filters";

export type UserSettings = {
  calendarUrl?: string | null;
  chatCourseId?: string | null;
  chatModel?: string;
  chatReasoningEffort?: string;
  courseResourcesLayout?: CourseResourcesLayout;
  courseResourcesTypeFilter?: MaterialTypeFilter;
};

export type UserSettingsController = {
  loaded: boolean;
  settings: UserSettings;
  update: (partial: UserSettings) => void;
};

const SAVE_DEBOUNCE_MS = 600;

export function useUserSettings() {
  const { isLoaded, isSignedIn } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<UserSettings>({});
  const loadedRef = useRef(false);
  const pendingBeforeLoad = useRef<UserSettings>({});

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      void fetch("/api/user/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings: latest.current }),
      }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/user/settings", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as { settings?: UserSettings };
        if (!controller.signal.aborted) {
          const loadedSettings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
          const pending = pendingBeforeLoad.current;
          pendingBeforeLoad.current = {};
          const next = { ...loadedSettings, ...pending };
          latest.current = next;
          loadedRef.current = true;
          setSettings(next);
          if (Object.keys(pending).length > 0) {
            flush();
          }
        }
      } catch {
        // Settings are best-effort; ignore load failures.
      } finally {
        if (!controller.signal.aborted) {
          loadedRef.current = true;
          setLoaded(true);
          if (Object.keys(pendingBeforeLoad.current).length > 0) {
            flush();
          }
        }
      }
    })();
    return () => controller.abort();
  }, [flush, isLoaded, isSignedIn]);

  // Merge a partial update, persist it (debounced). No-op if nothing changes.
  const update = useCallback(
    (partial: UserSettings) => {
      const changed = (Object.keys(partial) as (keyof UserSettings)[]).some(
        (key) => partial[key] !== latest.current[key],
      );
      if (!changed) {
        return;
      }
      const next = { ...latest.current, ...partial };
      latest.current = next;
      setSettings(next);
      if (!loadedRef.current) {
        pendingBeforeLoad.current = { ...pendingBeforeLoad.current, ...partial };
        return;
      }
      flush();
    },
    [flush],
  );

  return { settings, loaded, update };
}
