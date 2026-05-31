import { useState } from "react";

import type { WebexRecording, WebexRecordingState } from "@/lib/dashboard-data";
import { apiRequest, getErrorMessage } from "@/lib/moodle-api";

export function useWebexRecordings() {
  const [recordingsByCourseId, setRecordingsByCourseId] = useState<Record<string, WebexRecordingState>>({});
  const [selectedRecordingByCourseId, setSelectedRecordingByCourseId] = useState<Record<string, WebexRecording | null>>({});

  function resetRecordings() {
    setRecordingsByCourseId({});
    setSelectedRecordingByCourseId({});
  }

  function selectedRecordingForCourse(courseId: string | null): WebexRecording | null {
    return courseId ? selectedRecordingByCourseId[courseId] ?? null : null;
  }

  function selectRecording(courseId: string, recording: WebexRecording) {
    setSelectedRecordingByCourseId((current) => ({
      ...current,
      [courseId]: recording,
    }));
  }

  async function loadRecordings(courseId: string, options: { refresh?: boolean } = {}) {
    const cached = recordingsByCourseId[courseId];
    if (!options.refresh && cached?.loaded) {
      return;
    }

    setRecordingsByCourseId((current) => ({
      ...current,
      [courseId]: {
        loading: true,
        loaded: cached?.loaded ?? false,
        error: null,
        recordings: cached?.recordings ?? [],
      },
    }));

    try {
      const response = await apiRequest<{ recordings?: WebexRecording[] }>(
        `/courses/${encodeURIComponent(courseId)}/recordings`,
      );
      const recordings = response.recordings ?? [];
      setRecordingsByCourseId((current) => ({
        ...current,
        [courseId]: { loading: false, loaded: true, error: null, recordings },
      }));
      setSelectedRecordingByCourseId((current) => ({
        ...current,
        [courseId]: current[courseId] ?? recordings[0] ?? null,
      }));
    } catch (loadError) {
      setRecordingsByCourseId((current) => ({
        ...current,
        [courseId]: {
          loading: false,
          loaded: cached?.loaded ?? false,
          error: getErrorMessage(loadError),
          recordings: cached?.recordings ?? [],
        },
      }));
    }
  }

  async function signInWebexBrowser(courseId: string, credentials: { username: string; password: string }) {
    await apiRequest<{ savedSession: boolean }>("/webex/credentials", {
      method: "POST",
      body: JSON.stringify({ ...credentials, courseId }),
    });
  }

  return {
    loadRecordings,
    recordingsByCourseId,
    resetRecordings,
    signInWebexBrowser,
    selectRecording,
    selectedRecordingForCourse,
  };
}
