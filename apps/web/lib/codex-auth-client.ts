export type CodexAuthEvent =
  | {
      type: "device_code";
      verificationUri: string;
      userCode: string;
      expiresInSeconds?: number;
    }
  | {
      type: "browser_auth";
      authUrl: string;
      callbackHost?: string;
    }
  | { type: "completed" }
  | { authenticated: boolean }
  | { type: "error"; error: string };

export type CodexDeviceCode = {
  verificationUri: string;
  userCode: string;
  expiresInSeconds?: number;
};

type CodexAuthStatusPayload = {
  authenticated?: boolean;
  error?: string;
};

export async function getCodexAuthStatus(signal?: AbortSignal): Promise<CodexAuthStatusPayload & { ok: boolean }> {
  const response = await fetch("/api/codex/auth", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as CodexAuthStatusPayload;
  return {
    ...payload,
    ok: response.ok,
    error: payload.error ?? (response.ok ? undefined : `Codex status failed with ${response.status}.`),
  };
}

export async function startCodexAuth(signal?: AbortSignal): Promise<{ event: CodexAuthEvent; ok: boolean; error?: string }> {
  const response = await fetch("/api/codex/auth", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as CodexAuthEvent & { error?: string };
  if (!response.ok) {
    return {
      event: payload,
      ok: false,
      error: "error" in payload && typeof payload.error === "string" ? payload.error : `Could not start ChatGPT sign-in (${response.status}).`,
    };
  }
  return { event: payload, ok: true };
}

export async function deleteCodexAuth(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch("/api/codex/auth", {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return {
    ok: response.ok,
    error: payload.error ?? (response.ok ? undefined : `Could not sign out of ChatGPT (${response.status}).`),
  };
}

export async function waitForCodexAuth(signal?: AbortSignal): Promise<boolean> {
  const deadline = Date.now() + 15 * 60 * 1000;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      return false;
    }

    await sleep(2_000, signal);

    const status = await getCodexAuthStatus(signal);
    if (!status.ok) {
      throw new Error(status.error ?? "Could not check Codex authentication.");
    }
    if (status.authenticated) {
      return true;
    }
  }

  return false;
}

export async function runCodexConnectFlow(
  handlers: {
    onBrowserAuth?: (authUrl: string) => void;
    onDeviceCode?: (deviceCode: CodexDeviceCode) => void;
  },
  signal?: AbortSignal,
): Promise<boolean> {
  const started = await startCodexAuth(signal);
  if (!started.ok) {
    throw new Error(started.error ?? "Could not start ChatGPT sign-in.");
  }

  const payload = started.event;
  if ("authenticated" in payload && payload.authenticated) {
    return true;
  }
  if ("type" in payload && payload.type === "device_code") {
    handlers.onDeviceCode?.({
      verificationUri: payload.verificationUri,
      userCode: payload.userCode,
      expiresInSeconds: payload.expiresInSeconds,
    });
  } else if ("type" in payload && payload.type === "browser_auth") {
    handlers.onBrowserAuth?.(payload.authUrl);
    if (typeof window !== "undefined") {
      window.open(payload.authUrl, "_blank", "noopener,noreferrer");
    }
  } else if ("type" in payload && payload.type === "completed") {
    return true;
  } else if ("type" in payload && payload.type === "error") {
    throw new Error(payload.error);
  }

  return waitForCodexAuth(signal);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
