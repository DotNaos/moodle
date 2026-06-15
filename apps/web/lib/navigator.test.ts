import { describe, expect, test } from "bun:test";

import {
  buildNavigatorURL,
  closeDocument,
  drillTo,
  homeState,
  navigatorBreadcrumbs,
  navigatorLayout,
  navigatorStateFromDashboardRoute,
  navigatorStatesEqual,
  openDocument,
  parentOf,
  parseNavigatorLocation,
  pathForDocument,
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
} from "@/lib/navigator-history";
import { parseDashboardRoute } from "@/lib/dashboard-route";

function roundTrip(state: NavigatorState): NavigatorState {
  const url = buildNavigatorURL(state);
  const [pathname, search = ""] = url.split("?");
  return parseNavigatorLocation(pathname, search);
}

describe("navigator URL mapping", () => {
  test("round-trips drill positions", () => {
    const states: NavigatorState[] = [
      homeState(),
      { path: { kind: "courses" }, document: null },
      { path: { kind: "course", courseId: "42" }, document: null },
      { path: { kind: "course-mode", courseId: "42", mode: "materials" }, document: null },
      { path: { kind: "course-mode", courseId: "42", mode: "tasks" }, document: null },
      { path: { kind: "course-mode", courseId: "42", mode: "pipeline" }, document: null },
    ];
    for (const state of states) {
      expect(navigatorStatesEqual(roundTrip(state), state)).toBe(true);
    }
  });

  test("round-trips open documents", () => {
    const documents = [
      openDocument(homeState(), { kind: "material", courseId: "42", materialId: "m 1" }),
      openDocument(homeState(), { kind: "task", courseId: "42", taskId: "t-9" }),
      openDocument(homeState(), { kind: "script-section", courseId: "42", sectionId: "sec/1" }),
      openDocument(homeState(), { kind: "formula", courseId: "42" }),
      openDocument(homeState(), { kind: "recording", courseId: "42", recordingId: "rec-1" }),
      openDocument(homeState(), { kind: "calendar-grid" }),
      openDocument(homeState(), { kind: "calendar-event", eventUid: "uid-1@moodle" }),
      openDocument(homeState(), { kind: "chat-session", sessionId: "abc", courseId: "42" }),
      openDocument(homeState(), { kind: "chat-session", sessionId: null, courseId: null }),
    ];
    for (const state of documents) {
      expect(navigatorStatesEqual(roundTrip(state), state)).toBe(true);
    }
  });

  test("root URL is the landing view", () => {
    const state = parseNavigatorLocation("/");
    expect(state.path.kind).toBe("home");
    expect(state.document).toBeNull();
    expect(navigatorLayout(state)).toBe("full");
  });

  test("chat URL opens a new chat directly", () => {
    const state = parseNavigatorLocation("/chat");
    expect(state.path).toEqual({ kind: "chat" });
    expect(state.document).toEqual({ kind: "chat-session", sessionId: null, courseId: null });
    expect(buildNavigatorURL(state)).toBe("/chat/new");

    const history = parseNavigatorLocation("/chat/history");
    expect(history).toEqual({ path: { kind: "chat" }, document: null });
  });

  test("calendar URL opens the calendar view directly", () => {
    const state = parseNavigatorLocation("/calendar");
    expect(state.path).toEqual({ kind: "calendar" });
    expect(state.document).toEqual({ kind: "calendar-grid" });
    expect(buildNavigatorURL(state)).toBe("/calendar/grid");

    const history = parseNavigatorLocation("/calendar/history");
    expect(history).toEqual({ path: { kind: "calendar" }, document: null });
  });

  test("documents imply split layout and their natural list path", () => {
    const state = parseNavigatorLocation("/courses/42/materials/m1");
    expect(navigatorLayout(state)).toBe("split");
    expect(state.path).toEqual({ kind: "course-mode", courseId: "42", mode: "materials" });
    expect(state.document).toEqual({ kind: "material", courseId: "42", materialId: "m1" });
  });

  test("formula opens as a document at the course level", () => {
    const state = parseNavigatorLocation("/courses/42/formula");
    expect(state.document).toEqual({ kind: "formula", courseId: "42" });
    expect(state.path).toEqual({ kind: "course", courseId: "42" });
  });

  test("calendar grid is a document over the events list", () => {
    const state = parseNavigatorLocation("/calendar/grid");
    expect(state.document).toEqual({ kind: "calendar-grid" });
    expect(state.path).toEqual({ kind: "calendar" });
  });

  test("unknown URLs fall back to landing", () => {
    expect(parseNavigatorLocation("/nonsense/deep").path.kind).toBe("home");
    expect(parseNavigatorLocation("/courses/42/unknown").path).toEqual({ kind: "course", courseId: "42" });
  });

  test("pipeline is a course-level inspector route without nested documents", () => {
    const state = parseNavigatorLocation("/courses/42/pipeline");
    expect(state).toEqual({ path: { kind: "course-mode", courseId: "42", mode: "pipeline" }, document: null });

    const nested = parseNavigatorLocation("/courses/42/pipeline/node-1");
    expect(nested).toEqual({ path: { kind: "course-mode", courseId: "42", mode: "pipeline" }, document: null });
  });

  test("legacy query URLs convert to navigator states", () => {
    const route = parseDashboardRoute("/", "?course=42&mode=tasks&task=t1");
    const state = navigatorStateFromDashboardRoute(route);
    expect(state.document).toEqual({ kind: "task", courseId: "42", taskId: "t1" });

    const legacyParsed = parseNavigatorLocation("/", "?course=42&mode=tasks&task=t1");
    expect(navigatorStatesEqual(legacyParsed, state)).toBe(true);
  });

  test("legacy calendar and chat routes convert to documents", () => {
    const calendar = navigatorStateFromDashboardRoute(parseDashboardRoute("/calendar"));
    expect(calendar.document).toEqual({ kind: "calendar-grid" });

    const chat = navigatorStateFromDashboardRoute(parseDashboardRoute("/chat", "?course=42"));
    expect(chat.document).toEqual({ kind: "chat-session", sessionId: null, courseId: "42" });
  });
});

describe("navigator transitions", () => {
  test("drilling keeps an open document", () => {
    const opened = openDocument(homeState(), { kind: "material", courseId: "42", materialId: "m1" });
    const drilled = drillTo(opened, { kind: "course-mode", courseId: "42", mode: "tasks" });
    expect(drilled.document).toEqual(opened.document);
    expect(drilled.path).toEqual({ kind: "course-mode", courseId: "42", mode: "tasks" });
  });

  test("opening a document aligns the path with its list", () => {
    const fromChat = drillTo(homeState(), { kind: "chat" });
    const opened = openDocument(fromChat, { kind: "material", courseId: "42", materialId: "m1" });
    expect(opened.path).toEqual(pathForDocument(opened.document!));
  });

  test("closing a document returns to the full-width list", () => {
    const opened = openDocument(homeState(), { kind: "calendar-event", eventUid: "uid-1" });
    const closed = closeDocument(opened);
    expect(closed.document).toBeNull();
    expect(closed.path).toEqual({ kind: "calendar" });
    expect(navigatorLayout(closed)).toBe("full");
  });

  test("parentOf walks document, then path levels, then stops at home", () => {
    const opened = openDocument(homeState(), { kind: "material", courseId: "42", materialId: "m1" });
    const list = parentOf(opened)!;
    expect(list.document).toBeNull();
    expect(list.path).toEqual({ kind: "course-mode", courseId: "42", mode: "materials" });

    const course = parentOf(list)!;
    expect(course.path).toEqual({ kind: "course", courseId: "42" });

    const courses = parentOf(course)!;
    expect(courses.path).toEqual({ kind: "courses" });

    const home = parentOf(courses)!;
    expect(home.path.kind).toBe("home");
    expect(parentOf(home)).toBeNull();
  });

  test("chat documents go back to home instead of the hidden chat history list", () => {
    const opened = openDocument(homeState(), { kind: "chat-session", sessionId: null, courseId: null });
    const parent = parentOf(opened);
    expect(parent).toEqual(homeState());
  });

  test("calendar documents go back to home instead of the hidden calendar history list", () => {
    const grid = openDocument(homeState(), { kind: "calendar-grid" });
    expect(parentOf(grid)).toEqual(homeState());

    const event = openDocument(homeState(), { kind: "calendar-event", eventUid: "uid-1" });
    expect(parentOf(event)).toEqual(homeState());
  });
});

describe("navigator breadcrumbs", () => {
  test("builds the full trail for an open material", () => {
    const state = openDocument(homeState(), { kind: "material", courseId: "42", materialId: "m1" });
    const crumbs = navigatorBreadcrumbs(state, {
      courseTitle: () => "HPC",
      materialName: () => "Teil 04",
    });
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Start", "Kurse", "HPC", "Materialien", "Teil 04"]);
    expect(crumbs.at(-2)?.target.document).toBeNull();
    expect(navigatorStatesEqual(crumbs.at(-1)!.target, state)).toBe(true);
  });

  test("falls back to generic labels without resolvers", () => {
    const state = openDocument(homeState(), { kind: "chat-session", sessionId: "abc", courseId: null });
    const labels = navigatorBreadcrumbs(state).map((crumb) => crumb.label);
    expect(labels).toEqual(["Start", "Chat"]);
  });

  test("new chat breadcrumb skips the hidden history page", () => {
    const state = openDocument(homeState(), { kind: "chat-session", sessionId: null, courseId: null });
    const crumbs = navigatorBreadcrumbs(state);
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Start", "Neuer Chat"]);
    expect(crumbs[0]?.target).toEqual(homeState());
  });

  test("calendar breadcrumbs skip the hidden history page", () => {
    const grid = openDocument(homeState(), { kind: "calendar-grid" });
    expect(navigatorBreadcrumbs(grid).map((crumb) => crumb.label)).toEqual(["Start", "Kalenderansicht"]);

    const event = openDocument(homeState(), { kind: "calendar-event", eventUid: "uid-1" });
    expect(navigatorBreadcrumbs(event, { calendarEventTitle: () => "Abgabe" }).map((crumb) => crumb.label)).toEqual([
      "Start",
      "Abgabe",
    ]);
  });

  test("landing has a single crumb", () => {
    expect(navigatorBreadcrumbs(homeState()).map((crumb) => crumb.label)).toEqual(["Start"]);
  });
});

describe("navigator history", () => {
  test("push, back and forward walk the drill history", () => {
    let history = createNavigatorHistory(homeState());
    history = pushNavigatorState(history, { path: { kind: "courses" }, document: null });
    history = pushNavigatorState(history, { path: { kind: "course", courseId: "42" }, document: null });

    expect(canGoBack(history)).toBe(true);
    expect(canGoForward(history)).toBe(false);

    history = goBack(history);
    expect(currentNavigatorState(history).path).toEqual({ kind: "courses" });
    expect(canGoForward(history)).toBe(true);

    history = goForward(history);
    expect(currentNavigatorState(history).path).toEqual({ kind: "course", courseId: "42" });
  });

  test("pushing after going back drops the forward branch", () => {
    let history = createNavigatorHistory(homeState());
    history = pushNavigatorState(history, { path: { kind: "courses" }, document: null });
    history = goBack(history);
    history = pushNavigatorState(history, { path: { kind: "calendar" }, document: null });

    expect(canGoForward(history)).toBe(false);
    expect(currentNavigatorState(history).path).toEqual({ kind: "calendar" });
  });

  test("pushing the current state is a no-op", () => {
    const initial = createNavigatorHistory(homeState());
    expect(pushNavigatorState(initial, homeState())).toBe(initial);
  });

  test("replace swaps the current entry without adding a step", () => {
    let history = createNavigatorHistory(homeState());
    history = pushNavigatorState(history, { path: { kind: "chat" }, document: null });
    history = replaceNavigatorState(history, openDocument(homeState(), { kind: "chat-session", sessionId: "s1", courseId: null }));

    expect(history.entries).toHaveLength(2);
    expect(currentNavigatorState(history).document).toEqual({ kind: "chat-session", sessionId: "s1", courseId: null });
    history = goBack(history);
    expect(currentNavigatorState(history).path.kind).toBe("home");
  });
});
