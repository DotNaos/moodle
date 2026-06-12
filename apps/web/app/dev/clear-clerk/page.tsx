"use client";

import { useEffect } from "react";

const CLERK_STORAGE_PREFIXES = ["__clerk", "clerk-"] as const;

export default function ClearClerkPage(): null {
  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (CLERK_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix) || key.includes("clerk"))) {
        localStorage.removeItem(key);
      }
    }

    for (const key of Object.keys(sessionStorage)) {
      if (key.includes("clerk")) {
        sessionStorage.removeItem(key);
      }
    }

    window.location.replace("/api/dev/clear-clerk");
  }, []);

  return null;
}
