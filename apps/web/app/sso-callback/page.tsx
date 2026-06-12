"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { readAuthReturnTo } from "@/components/google-sign-in-button";

const SIGN_IN_TIMEOUT_MS = 20_000;

export default function SSOCallbackPage() {
  const [returnTo] = useState(() => readAuthReturnTo());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setError("Sign-in timed out. Please try again.");
    }, SIGN_IN_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Signing in
      </div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/"
        signInForceRedirectUrl={returnTo}
        signUpFallbackRedirectUrl="/"
        signUpForceRedirectUrl={returnTo}
      />
      <div id="clerk-captcha" />
    </main>
  );
}
