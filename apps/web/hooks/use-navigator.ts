"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildNavigatorURL,
  closeDocument,
  drillTo,
  homeState,
  navigatorLayout,
  navigatorStatesEqual,
  openDocument,
  parentOf,
  parseNavigatorLocation,
  type NavigatorDocument,
  type NavigatorPath,
  type NavigatorState,
} from "@/lib/navigator";
import {
  canGoBack,
  canGoForward,
  createNavigatorHistory,
  currentNavigatorState,
  goBack,
  goForward,
  pushNavigatorState,
  replaceNavigatorState,
  type NavigatorHistory,
} from "@/lib/navigator-history";

function readNavigatorState(): NavigatorState {
  if (typeof window === "undefined") {
    return homeState();
  }
  return parseNavigatorLocation(window.location.pathname, window.location.search);
}

function syncBrowserURL(state: NavigatorState) {
  const nextUrl = buildNavigatorURL(state);
  const currentUrl = window.location.pathname + window.location.search;
  if (nextUrl !== currentUrl) {
    window.history.replaceState({ ...window.history.state, as: nextUrl, url: nextUrl }, "", nextUrl);
  }
}

export function useNavigator() {
  const [history, setHistory] = useState<NavigatorHistory>(() => createNavigatorHistory(readNavigatorState()));
  const state = currentNavigatorState(history);
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyHistory = useCallback((update: (current: NavigatorHistory) => NavigatorHistory) => {
    setHistory((current) => {
      const next = update(current);
      if (next !== current) {
        syncBrowserURL(currentNavigatorState(next));
      }
      return next;
    });
  }, []);

  const navigate = useCallback(
    (next: NavigatorState) => {
      applyHistory((current) => pushNavigatorState(current, next));
    },
    [applyHistory],
  );

  const drill = useCallback(
    (path: NavigatorPath) => {
      navigate(drillTo(stateRef.current, path));
    },
    [navigate],
  );

  const open = useCallback(
    (document: NavigatorDocument) => {
      navigate(openDocument(stateRef.current, document));
    },
    [navigate],
  );

  const close = useCallback(() => {
    navigate(closeDocument(stateRef.current));
  }, [navigate]);

  const up = useCallback(() => {
    const parent = parentOf(stateRef.current);
    if (parent) {
      navigate(parent);
    }
  }, [navigate]);

  const back = useCallback(() => {
    applyHistory(goBack);
  }, [applyHistory]);

  const forward = useCallback(() => {
    applyHistory(goForward);
  }, [applyHistory]);

  useEffect(() => {
    const syncFromBrowser = () => {
      const browserState = readNavigatorState();
      setHistory((current) =>
        navigatorStatesEqual(currentNavigatorState(current), browserState)
          ? current
          : replaceNavigatorState(current, browserState),
      );
    };
    window.addEventListener("popstate", syncFromBrowser);
    return () => window.removeEventListener("popstate", syncFromBrowser);
  }, []);

  return {
    back,
    canGoBack: canGoBack(history),
    canGoForward: canGoForward(history),
    close,
    document: state.document,
    drill,
    forward,
    layout: navigatorLayout(state),
    navigate,
    open,
    path: state.path,
    state,
    up,
  };
}

export type NavigatorController = ReturnType<typeof useNavigator>;
