"use client";

import { GrainientBackground } from "@/components/grainient-background";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ModeToggle } from "@/components/mode-toggle";
import { Spinner } from "@/components/ui/spinner";

export function SignedOutHome({ moodleServicesUrl }: { moodleServicesUrl: string }) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 sm:px-8 lg:py-28">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ModeToggle className="border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
      </div>
      <GrainientBackground
        blendAngle={-8}
        blendSoftness={0.22}
        color1="#B8A8FF"
        color2="#6F63E8"
        color3="#4A47E6"
        colorBalance={-0.08}
        contrast={1.18}
        grainAmount={0.2}
        grainScale={1.1}
        saturation={1.15}
        zoom={1.05}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="space-y-2">
          <h1 className="text-[2.5rem] font-medium tracking-[-0.04em] text-white sm:text-[2.75rem]">Moodle</h1>
          <p className="text-sm leading-6 text-white/60">Sign in to open your courses and study workspace.</p>
        </div>
        <div className="mt-10 w-full space-y-4">
          <GoogleSignInButton />
          <a
            className="inline-flex text-sm text-white/55 underline-offset-4 transition-colors hover:text-white/85"
            href={`${moodleServicesUrl}/api/docs`}
            rel="noreferrer"
            target="_blank"
          >
            API docs
          </a>
        </div>
      </div>
    </main>
  );
}

export function FullPageLoading() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden />
        Loading
      </div>
    </main>
  );
}
