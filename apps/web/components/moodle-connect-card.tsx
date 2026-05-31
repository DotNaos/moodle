"use client";

import { CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMobileClientDownloadUrl } from "@/lib/mobile-client";

type MoodleConnectCardProps = {
  onConnected: () => void;
};

type BridgeStartResponse = {
  bridgeUrl?: string;
  challenge?: string;
  expiresAt?: string;
  error?: string;
};

type BridgeStatusResponse = {
  status?: "pending" | "connected" | "expired";
  error?: string;
};

type BridgeState = "starting" | "waiting" | "connected" | "failed";

export function MoodleConnectCard({ onConnected }: MoodleConnectCardProps) {
  const mobileClientDownloadUrl = getMobileClientDownloadUrl();
  const [state, setState] = useState<BridgeState>("starting");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [challenge, setChallenge] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [credentialLoading, setCredentialLoading] = useState(false);

  const startBridge = useCallback(async () => {
    setState("starting");
    setBridgeUrl("");
    setChallenge("");
    setExpiresAt("");
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/mobile/bridge/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as BridgeStartResponse;
      if (!response.ok || !payload.bridgeUrl || !payload.challenge) {
        throw new Error(payload.error ?? "Could not create a mobile bridge QR.");
      }
      setBridgeUrl(payload.bridgeUrl);
      setChallenge(payload.challenge);
      setExpiresAt(payload.expiresAt ?? "");
      setState("waiting");
    } catch (startError) {
      setState("failed");
      setError(getErrorMessage(startError));
    }
  }, []);

  useEffect(() => {
    void startBridge();
  }, [startBridge]);

  useEffect(() => {
    if (state !== "waiting" || !challenge) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/mobile/bridge/status?challenge=${encodeURIComponent(challenge)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as BridgeStatusResponse;
        if (cancelled) {
          return;
        }
        if (response.status === 410 || payload.status === "expired") {
          setState("failed");
          setError("This bridge QR expired. Create a new one and scan it again.");
          return;
        }
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not check the bridge status.");
        }
        if (payload.status === "connected") {
          setState("connected");
          setError(null);
          onConnected();
        }
      } catch (pollError) {
        if (!cancelled) {
          setState("failed");
          setError(getErrorMessage(pollError));
        }
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 2000);
    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [challenge, onConnected, state]);

  async function copyBridgeURL() {
    if (!bridgeUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(bridgeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      setError(getErrorMessage(copyError));
    }
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/moodle/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not connect Moodle account.");
      }
      setPassword("");
      setState("connected");
      onConnected();
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setCredentialLoading(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 rounded-[2rem] bg-card p-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center lg:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <KeyRound aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight">Connect Moodle</h2>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Sign in once with your FHGR Moodle login. The server creates the same mobile token the app would provide and
            stores that token session, not your password.
          </p>
        </div>
        <form className="flex flex-col gap-2" onSubmit={submitCredentials}>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="FHGR username"
            autoComplete="username"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
          />
          <Button type="submit" disabled={credentialLoading || !username.trim() || !password}>
            {credentialLoading ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
            Sign in
          </Button>
        </form>
        <div className="flex flex-col gap-2 pt-2">
          <p className="text-sm text-muted-foreground">Already using the iPhone app?</p>
          <Button asChild variant="secondary" className="w-fit">
            <a href={mobileClientDownloadUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden />
              Download Moodle Client
            </a>
          </Button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
      </div>

      <div className="grid gap-5 rounded-[1.75rem] bg-muted p-5 sm:grid-cols-[320px_1fr] sm:items-center">
        <div className="grid aspect-square place-items-center rounded-[1.5rem] bg-white p-5">
          {state === "starting" ? (
            <Loader2 className="size-12 animate-spin text-primary" aria-hidden />
          ) : bridgeUrl ? (
            <QRCodeSVG className="h-full w-full max-w-[280px]" value={bridgeUrl} size={280} marginSize={1} />
          ) : (
            <QrCode className="size-12 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {state === "connected" ? (
              <CheckCircle2 className="text-primary" aria-hidden />
            ) : state === "waiting" ? (
              <Smartphone className="text-primary" aria-hidden />
            ) : (
              <Loader2 className="animate-spin text-primary" aria-hidden />
            )}
            {getStatusLabel(state)}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            The QR flow still works if your phone already has the mobile token. Otherwise, use the sign-in form on the
            left.
          </p>
          {expiresAt ? (
            <p className="text-xs text-muted-foreground">
              Expires at {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void copyBridgeURL()} disabled={!bridgeUrl}>
              <Copy aria-hidden />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void startBridge()}>
              <RefreshCw aria-hidden />
              New QR
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function getStatusLabel(state: BridgeState): string {
  switch (state) {
    case "starting":
      return "Creating bridge QR";
    case "waiting":
      return "Waiting for iPhone approval";
    case "connected":
      return "Moodle connected";
    case "failed":
      return "Bridge needs attention";
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
