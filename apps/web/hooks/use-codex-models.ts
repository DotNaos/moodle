import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCodexAuthStatus,
  runCodexConnectFlow,
  type CodexDeviceCode,
} from "@/lib/codex-auth-client";

export type CodexModelOption = {
  defaultReasoningEffort?: string;
  description?: string;
  id: string;
  label: string;
  reasoningEfforts?: Array<{ id: string; label: string }>;
  speedTiers?: string[];
};

export function useCodexModels(courseId?: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const [authChecking, setAuthChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deviceCode, setDeviceCode] = useState<CodexDeviceCode | null>(null);
  const connectAbortRef = useRef<AbortController | null>(null);
  const [connected, setConnected] = useState(false);
  const [models, setModels] = useState<CodexModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/codex/models", {
        cache: "no-store",
        credentials: "same-origin",
        headers: courseId ? { "x-course-id": courseId } : undefined,
        signal,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; models?: CodexModelOption[] };
      if (!response.ok) {
        throw new Error(payload.error ?? `Model catalog failed with ${response.status}.`);
      }
      const rawModels = Array.isArray(payload) ? payload : Array.isArray(payload.models) ? payload.models : [];
      const loadedModels = rawModels.filter((model) => model && model.id && model.label);
      setModels(loadedModels);
      setSelectedModel((current) => {
        const nextModel = loadedModels.some((model) => model.id === current) ? current : loadedModels[0]?.id ?? "";
        const model = loadedModels.find((item) => item.id === nextModel) ?? null;
        setSelectedReasoningEffort((currentEffort) => nextReasoningEffort(model, currentEffort));
        return nextModel;
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setModels([]);
      setSelectedModel("");
      setSelectedReasoningEffort("");
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const refreshCatalog = useCallback(async (signal?: AbortSignal) => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    setAuthChecking(true);
    setError(null);
    try {
      const authPayload = await getCodexAuthStatus(signal);
      if (!authPayload.ok) {
        throw new Error(authPayload.error ?? "Codex status failed.");
      }
      if (!authPayload.authenticated) {
        setConnected(false);
        setModels([]);
        setSelectedModel("");
        setSelectedReasoningEffort("");
        setError(null);
        return;
      }

      setConnected(true);
      await loadModels(signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setConnected(false);
      setModels([]);
      setSelectedModel("");
      setSelectedReasoningEffort("");
      setError(err instanceof Error ? err.message : "Failed to load Codex models");
    } finally {
      setAuthChecking(false);
    }
  }, [isLoaded, isSignedIn, loadModels]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setConnected(false);
      setModels([]);
      setSelectedModel("");
      setSelectedReasoningEffort("");
      setError(null);
      return;
    }

    const controller = new AbortController();
    void refreshCatalog(controller.signal);
    return () => controller.abort();
  }, [isLoaded, isSignedIn, courseId, refreshCatalog]);

  useEffect(() => {
    return () => {
      connectAbortRef.current?.abort();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isLoaded || !isSignedIn || connecting || authChecking) {
      return;
    }

    connectAbortRef.current?.abort();
    const controller = new AbortController();
    connectAbortRef.current = controller;

    setConnecting(true);
    setError(null);
    setDeviceCode(null);

    try {
      const authenticated = await runCodexConnectFlow(
        {
          onDeviceCode: (code) => setDeviceCode(code),
        },
        controller.signal,
      );
      if (!authenticated) {
        throw new Error("ChatGPT sign-in did not finish.");
      }

      setDeviceCode(null);
      setConnected(true);
      await loadModels(controller.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setConnected(false);
      setError(err instanceof Error ? err.message : "Could not connect ChatGPT.");
    } finally {
      setConnecting(false);
    }
  }, [authChecking, connecting, isLoaded, isSignedIn, loadModels]);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setSelectedReasoningEffort((current) => {
      const nextModel = models.find((model) => model.id === modelId) ?? null;
      return nextReasoningEffort(nextModel, current);
    });
  }, [models]);

  const activeModelOption = models.find((model) => model.id === selectedModel) ?? null;

  return {
    authChecking,
    connect,
    connected,
    connecting,
    deviceCode,
    error,
    loading,
    models,
    selectedModel,
    activeModelOption,
    selectedReasoningEffort,
    loadModels,
    refreshCatalog,
    setConnected,
    setDeviceCode,
    setError,
    setSelectedModel: handleModelChange,
    setSelectedReasoningEffort,
  };
}

function nextReasoningEffort(model: CodexModelOption | null, current: string): string {
  const options = Array.isArray(model?.reasoningEfforts) ? model!.reasoningEfforts! : [];
  if (options.some((option) => option.id === current)) {
    return current;
  }
  if (model?.defaultReasoningEffort && options.some((option) => option.id === model.defaultReasoningEffort)) {
    return model.defaultReasoningEffort;
  }
  return options[0]?.id ?? "";
}
