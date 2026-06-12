"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest, getErrorMessage } from "@/lib/moodle-api";

export type CalendarEventSummary = {
  courseName?: string;
  end?: string;
  location?: string;
  start: string;
  summary: string;
  uid: string;
};

type CalendarResponse = {
  events?: CalendarEventSummary[];
};

// Loads the upcoming calendar events once when first enabled. Shared between
// the calendar drill list (sidebar + full view) and the event detail viewer.
export function useCalendarEvents(enabled: boolean) {
  const [events, setEvents] = useState<CalendarEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<CalendarResponse>("/courses?route=calendar&days=60");
      if (requestIdRef.current !== requestId) {
        return;
      }
      const sorted = [...(response.events ?? [])].sort(
        (left, right) => Date.parse(left.start) - Date.parse(right.start),
      );
      setEvents(sorted);
      loadedRef.current = true;
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled && !loadedRef.current) {
      void load();
    }
  }, [enabled, load]);

  return { error, events, loading, reload: load };
}
