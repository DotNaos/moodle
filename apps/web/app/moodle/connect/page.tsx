import { Suspense } from "react";

import { MoodleConnectPageClient } from "./ui";

export default function MoodleConnectPage() {
  return (
    <Suspense fallback={<MoodleConnectLoading />}>
      <MoodleConnectPageClient />
    </Suspense>
  );
}

function MoodleConnectLoading() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <p className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
        Checking Moodle access
      </p>
    </main>
  );
}
