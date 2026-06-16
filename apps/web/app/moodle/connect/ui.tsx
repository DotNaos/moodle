"use client";

import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { MoodleConnectCard } from "@/components/moodle-connect-card";

type BackendPreflightResponse = {
  state?: "ready" | "needs_moodle_connect" | "blocked";
  code?: string;
  error?: string;
  backend?: {
    mode?: string;
    serviceKind?: string;
  };
};

export function MoodleConnectPageClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [preflight, setPreflight] = useState<"checking" | "signed_out" | "ready" | "connect" | "blocked">("checking");
  const [preflightIssue, setPreflightIssue] = useState<BackendPreflightResponse | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!isSignedIn) {
      setPreflight("signed_out");
      setPreflightIssue(null);
      return;
    }

    let cancelled = false;
    setPreflight("checking");
    setPreflightIssue(null);
    void fetch("/api/backend/preflight", {
      cache: "no-store",
      credentials: "include",
    }).then((response) => {
      return response.json().catch(() => ({})) as Promise<BackendPreflightResponse>;
    }).then((payload) => {
      if (!cancelled) {
        setPreflightIssue(payload);
        if (payload.state === "ready") {
          setPreflight("ready");
          router.replace(nextPath);
          return;
        }
        if (payload.state === "needs_moodle_connect") {
          setPreflight("connect");
          return;
        }
        setPreflight("blocked");
      }
    }).catch(() => {
      if (!cancelled) {
        setPreflight("blocked");
        setPreflightIssue({
          state: "blocked",
          code: "backend_preflight_failed",
          error: "Moodle backend preflight could not be completed.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, nextPath, router]);

  if (!isLoaded || preflight === "checking" || preflight === "ready") {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Checking Moodle access
        </p>
      </main>
    );
  }

  if (!isSignedIn || preflight === "signed_out") {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sign in before connecting Moodle.
            </p>
          </div>
          <GoogleSignInButton />
        </div>
      </main>
    );
  }

  if (preflight === "blocked") {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-xl space-y-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Moodle unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The app could not prove that this frontend may use the configured Moodle backend.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-destructive/10 p-5 text-sm leading-6 text-destructive">
            <p className="font-semibold">{preflightIssue?.error ?? "Moodle backend is blocked."}</p>
            {preflightIssue?.code ? <p className="mt-2 text-xs opacity-80">Gate: {preflightIssue.code}</p> : null}
            {preflightIssue?.backend ? (
              <p className="mt-1 text-xs opacity-80">
                Backend: {preflightIssue.backend.mode ?? "unknown"} · {preflightIssue.backend.serviceKind ?? "unknown"}
              </p>
            ) : null}
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            type="button"
            onClick={() => {
              setPreflight("checking");
              setPreflightIssue(null);
              router.refresh();
              window.location.reload();
            }}
          >
            Check again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-auto px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <MoodleConnectCard
          onConnected={() => {
            router.replace(nextPath);
          }}
        />
      </div>
    </main>
  );
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/courses";
  }
  return value;
}
