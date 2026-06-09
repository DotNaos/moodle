"use client";

import { useEffect, useRef } from "react";

import {
  buildDashboardRouteURL,
  dashboardRouteFromInput,
  parseDashboardRoute,
  readDashboardLocation,
  readDashboardRoute,
  type DashboardRoute,
  type DashboardRouteURLInput,
} from "@/lib/dashboard-route";

export function replaceDashboardLocation(
  nextInput: DashboardRouteURLInput,
  applyRoute: (route: DashboardRoute) => void | Promise<void>,
): void {
  const nextUrl = buildDashboardRouteURL(nextInput);
  const currentUrl = readDashboardLocation();
  const nextRoute = dashboardRouteFromInput(nextInput);

  if (nextUrl !== currentUrl) {
    window.history.replaceState(
      { ...window.history.state, as: nextUrl, url: nextUrl },
      "",
      nextUrl,
    );
  }

  void applyRoute(nextRoute);
}

export function useDashboardRouteHydration({
  enabled,
  applyRoute,
}: {
  enabled: boolean;
  applyRoute: (route: DashboardRoute) => void | Promise<void>;
}) {
  const applyRouteRef = useRef(applyRoute);
  const hydratedRef = useRef(false);
  applyRouteRef.current = applyRoute;

  useEffect(() => {
    if (!enabled) {
      hydratedRef.current = false;
      return;
    }

    const syncFromBrowser = () => {
      void applyRouteRef.current(readDashboardRoute());
    };

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      syncFromBrowser();
    }

    window.addEventListener("popstate", syncFromBrowser);
    return () => window.removeEventListener("popstate", syncFromBrowser);
  }, [enabled]);
}
