"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@clerk/nextjs";

import { fetchWorkspaceFiles, type CodexWorkspaceFile } from "@/lib/codex-files";

export function useCodexFiles(reloadKey?: number) {
  const { isLoaded, isSignedIn } = useAuth();
  const [files, setFiles] = useState<CodexWorkspaceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!isLoaded || !isSignedIn) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const loaded = await fetchWorkspaceFiles(signal);
        if (!signal?.aborted) {
          setFiles(loaded);
        }
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load workspace files.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isLoaded, isSignedIn],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload, reloadKey]);

  return { files, loading, error, reload: () => void reload() };
}
