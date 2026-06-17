import { navigatorStatesEqual, parentOf, type NavigatorState } from "@/lib/navigator";

// In-memory back/forward history for the navigator. Course routes keep their
// own tree path, so ‹ › walk parent/child nodes inside the current course
// instead of replaying unrelated browser history or sibling visits.

const HISTORY_LIMIT = 100;

type NavigatorStack = {
  entries: NavigatorState[];
  index: number;
};

export type NavigatorHistory = {
  activeScope: string;
  scopes: Record<string, NavigatorStack>;
};

export function createNavigatorHistory(initial: NavigatorState): NavigatorHistory {
  const activeScope = scopeForState(initial);
  return {
    activeScope,
    scopes: {
      [activeScope]: seedStack(initial),
    },
  };
}

export function currentNavigatorState(history: NavigatorHistory): NavigatorState {
  return currentStack(history).entries[currentStack(history).index];
}

export function canGoBack(history: NavigatorHistory): boolean {
  return currentStack(history).index > 0;
}

export function canGoForward(history: NavigatorHistory): boolean {
  const stack = currentStack(history);
  return stack.index < stack.entries.length - 1;
}

// Navigating to a new state replaces the current scope with the tree path to
// that state. Back therefore moves to the parent node, not to the previous
// sibling the user happened to visit.
export function pushNavigatorState(history: NavigatorHistory, next: NavigatorState): NavigatorHistory {
  if (navigatorStatesEqual(currentNavigatorState(history), next)) {
    return history;
  }
  const nextScope = scopeForState(next);
  const stack = history.scopes[nextScope];
  if (!stack) {
    return setScopeStack(history, nextScope, seedStack(next));
  }
  if (navigatorStatesEqual(stack.entries[stack.index], next)) {
    return { ...history, activeScope: nextScope };
  }
  return setScopeStack(history, nextScope, seedStack(next));
}

// Replaces the current entry without creating a history step. Used when the
// browser URL changes underneath us (popstate) or for in-place corrections.
export function replaceNavigatorState(history: NavigatorHistory, next: NavigatorState): NavigatorHistory {
  if (navigatorStatesEqual(currentNavigatorState(history), next)) {
    return history;
  }
  const nextScope = scopeForState(next);
  const existing = history.scopes[nextScope];
  if (!existing) {
    return {
      activeScope: nextScope,
      scopes: {
        ...history.scopes,
        [nextScope]: seedStack(next),
      },
    };
  }
  const entries = [...existing.entries];
  entries[existing.index] = next;
  return {
    activeScope: nextScope,
    scopes: {
      ...history.scopes,
      [nextScope]: { entries, index: existing.index },
    },
  };
}

export function goBack(history: NavigatorHistory): NavigatorHistory {
  if (!canGoBack(history)) {
    return history;
  }
  return moveCurrentStack(history, -1);
}

export function goForward(history: NavigatorHistory): NavigatorHistory {
  if (!canGoForward(history)) {
    return history;
  }
  return moveCurrentStack(history, 1);
}

function currentStack(history: NavigatorHistory): NavigatorStack {
  return history.scopes[history.activeScope];
}

function moveCurrentStack(history: NavigatorHistory, delta: -1 | 1): NavigatorHistory {
  const stack = currentStack(history);
  return setScopeStack(history, history.activeScope, {
    entries: stack.entries,
    index: stack.index + delta,
  });
}

function setScopeStack(history: NavigatorHistory, scope: string, stack: NavigatorStack): NavigatorHistory {
  return {
    activeScope: scope,
    scopes: {
      ...history.scopes,
      [scope]: stack,
    },
  };
}

function seedStack(state: NavigatorState): NavigatorStack {
  const entries: NavigatorState[] = [];
  let current: NavigatorState | null = state;
  while (current) {
    entries.unshift(current);
    current = parentOf(current);
  }
  return {
    entries: entries.slice(-HISTORY_LIMIT),
    index: Math.min(entries.length, HISTORY_LIMIT) - 1,
  };
}

function scopeForState(state: NavigatorState): string {
  const courseId = courseIdForState(state);
  return courseId ? `course:${courseId}` : "global";
}

function courseIdForState(state: NavigatorState): string | null {
  if (state.document && "courseId" in state.document && state.document.courseId) {
    return state.document.courseId;
  }
  if ("courseId" in state.path) {
    return state.path.courseId;
  }
  return null;
}
