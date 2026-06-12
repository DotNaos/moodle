import { navigatorStatesEqual, type NavigatorState } from "@/lib/navigator";

// In-memory back/forward history for the navigator (VSCode style). The browser
// URL is kept in sync via replaceState, so the browser back button leaves the
// app while ‹ › walk this stack.

const HISTORY_LIMIT = 100;

export type NavigatorHistory = {
  entries: NavigatorState[];
  index: number;
};

export function createNavigatorHistory(initial: NavigatorState): NavigatorHistory {
  return { entries: [initial], index: 0 };
}

export function currentNavigatorState(history: NavigatorHistory): NavigatorState {
  return history.entries[history.index];
}

export function canGoBack(history: NavigatorHistory): boolean {
  return history.index > 0;
}

export function canGoForward(history: NavigatorHistory): boolean {
  return history.index < history.entries.length - 1;
}

// Navigating to a new state drops the forward branch, like a browser.
export function pushNavigatorState(history: NavigatorHistory, next: NavigatorState): NavigatorHistory {
  if (navigatorStatesEqual(currentNavigatorState(history), next)) {
    return history;
  }
  const entries = [...history.entries.slice(0, history.index + 1), next].slice(-HISTORY_LIMIT);
  return { entries, index: entries.length - 1 };
}

// Replaces the current entry without creating a history step. Used when the
// browser URL changes underneath us (popstate) or for in-place corrections.
export function replaceNavigatorState(history: NavigatorHistory, next: NavigatorState): NavigatorHistory {
  if (navigatorStatesEqual(currentNavigatorState(history), next)) {
    return history;
  }
  const entries = [...history.entries];
  entries[history.index] = next;
  return { entries, index: history.index };
}

export function goBack(history: NavigatorHistory): NavigatorHistory {
  return canGoBack(history) ? { entries: history.entries, index: history.index - 1 } : history;
}

export function goForward(history: NavigatorHistory): NavigatorHistory {
  return canGoForward(history) ? { entries: history.entries, index: history.index + 1 } : history;
}
