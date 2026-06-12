import { parseDashboardRouteSearch, type DashboardRoute } from "@/lib/dashboard-route";

// Drilldown navigation model for the hybrid layout:
// - `path` is where the navigator is browsing (pure UI drill state).
// - `document` is what is opened in the main view; null means the navigator
//   itself fills the main view ("merged"), non-null means split layout where
//   the navigator shrinks to a sidebar.
// Opening a document never moves `path` implicitly except through
// `openDocument`, which aligns the path with the document's natural list.

export type CourseMode = "materials" | "tasks" | "script" | "formula" | "recordings" | "pipeline";

// "formula" has no item list to drill into; it opens directly as a document.
export type DrillableCourseMode = Exclude<CourseMode, "formula">;

export type NavigatorPath =
  | { kind: "home" }
  | { kind: "courses" }
  | { kind: "course"; courseId: string }
  | { kind: "course-mode"; courseId: string; mode: DrillableCourseMode }
  | { kind: "calendar" }
  | { kind: "chat" };

export type NavigatorDocument =
  | { kind: "material"; courseId: string; materialId: string }
  | { kind: "task"; courseId: string; taskId: string }
  | { kind: "script-section"; courseId: string; sectionId: string }
  | { kind: "formula"; courseId: string }
  | { kind: "recording"; courseId: string; recordingId: string }
  | { kind: "calendar-grid" }
  | { kind: "calendar-event"; eventUid: string }
  | { kind: "chat-session"; sessionId: string | null; courseId: string | null };

export type NavigatorState = {
  path: NavigatorPath;
  document: NavigatorDocument | null;
};

export type NavigatorLayout = "full" | "split";

export const COURSE_MODE_LABELS: Record<CourseMode, string> = {
  materials: "Materialien",
  tasks: "Aufgaben",
  script: "Script",
  formula: "Formeln",
  recordings: "Videos",
  pipeline: "Pipeline",
};

const DRILLABLE_COURSE_MODES = new Set<string>(["materials", "tasks", "script", "recordings", "pipeline"]);

export function homeState(): NavigatorState {
  return { path: { kind: "home" }, document: null };
}

export function navigatorLayout(state: NavigatorState): NavigatorLayout {
  return state.document ? "split" : "full";
}

// The list a document naturally belongs to; used to align the sidebar when a
// document is opened from elsewhere (deep link, chat action, calendar event).
export function pathForDocument(document: NavigatorDocument): NavigatorPath {
  switch (document.kind) {
    case "material":
      return { kind: "course-mode", courseId: document.courseId, mode: "materials" };
    case "task":
      return { kind: "course-mode", courseId: document.courseId, mode: "tasks" };
    case "script-section":
      return { kind: "course-mode", courseId: document.courseId, mode: "script" };
    case "recording":
      return { kind: "course-mode", courseId: document.courseId, mode: "recordings" };
    case "formula":
      return { kind: "course", courseId: document.courseId };
    case "calendar-grid":
    case "calendar-event":
      return { kind: "calendar" };
    case "chat-session":
      return { kind: "chat" };
  }
}

export function openDocument(state: NavigatorState, document: NavigatorDocument): NavigatorState {
  return { path: pathForDocument(document), document };
}

export function closeDocument(state: NavigatorState): NavigatorState {
  return { path: state.path, document: null };
}

export function drillTo(state: NavigatorState, path: NavigatorPath): NavigatorState {
  // Drilling moves only the navigator; an open document stays open.
  return { path, document: state.document };
}

// One level up. With a document open, "up" first closes the document (back to
// the full-width list), then walks the path towards home.
export function parentOf(state: NavigatorState): NavigatorState | null {
  if (state.document) {
    return { path: state.path, document: null };
  }
  switch (state.path.kind) {
    case "home":
      return null;
    case "courses":
    case "calendar":
    case "chat":
      return homeState();
    case "course":
      return { path: { kind: "courses" }, document: null };
    case "course-mode":
      return { path: { kind: "course", courseId: state.path.courseId }, document: null };
  }
}

export function navigatorPathsEqual(left: NavigatorPath, right: NavigatorPath): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case "course":
      return left.courseId === (right as Extract<NavigatorPath, { kind: "course" }>).courseId;
    case "course-mode": {
      const other = right as Extract<NavigatorPath, { kind: "course-mode" }>;
      return left.courseId === other.courseId && left.mode === other.mode;
    }
    default:
      return true;
  }
}

export function navigatorDocumentsEqual(
  left: NavigatorDocument | null,
  right: NavigatorDocument | null,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case "material": {
      const other = right as Extract<NavigatorDocument, { kind: "material" }>;
      return left.courseId === other.courseId && left.materialId === other.materialId;
    }
    case "task": {
      const other = right as Extract<NavigatorDocument, { kind: "task" }>;
      return left.courseId === other.courseId && left.taskId === other.taskId;
    }
    case "script-section": {
      const other = right as Extract<NavigatorDocument, { kind: "script-section" }>;
      return left.courseId === other.courseId && left.sectionId === other.sectionId;
    }
    case "formula":
      return left.courseId === (right as Extract<NavigatorDocument, { kind: "formula" }>).courseId;
    case "recording": {
      const other = right as Extract<NavigatorDocument, { kind: "recording" }>;
      return left.courseId === other.courseId && left.recordingId === other.recordingId;
    }
    case "calendar-grid":
      return true;
    case "calendar-event":
      return left.eventUid === (right as Extract<NavigatorDocument, { kind: "calendar-event" }>).eventUid;
    case "chat-session": {
      const other = right as Extract<NavigatorDocument, { kind: "chat-session" }>;
      return left.sessionId === other.sessionId && left.courseId === other.courseId;
    }
  }
}

export function navigatorStatesEqual(left: NavigatorState, right: NavigatorState): boolean {
  return navigatorPathsEqual(left.path, right.path) && navigatorDocumentsEqual(left.document, right.document);
}

// URL mapping. The URL always describes the document when one is open (deep
// links restore the viewer); otherwise it describes the drill position. The
// sidebar drill position while a document is open is free UI state and is not
// encoded in the URL.

export function buildNavigatorURL(state: NavigatorState): string {
  const { document } = state;
  if (document) {
    switch (document.kind) {
      case "material":
        return `/courses/${encodeURIComponent(document.courseId)}/materials/${encodeURIComponent(document.materialId)}`;
      case "task":
        return `/courses/${encodeURIComponent(document.courseId)}/tasks/${encodeURIComponent(document.taskId)}`;
      case "script-section":
        return `/courses/${encodeURIComponent(document.courseId)}/script/${encodeURIComponent(document.sectionId)}`;
      case "formula":
        return `/courses/${encodeURIComponent(document.courseId)}/formula`;
      case "recording":
        return `/courses/${encodeURIComponent(document.courseId)}/recordings/${encodeURIComponent(document.recordingId)}`;
      case "calendar-grid":
        return "/calendar/grid";
      case "calendar-event":
        return `/calendar/events/${encodeURIComponent(document.eventUid)}`;
      case "chat-session": {
        const base = document.sessionId === null ? "/chat/new" : `/chat/${encodeURIComponent(document.sessionId)}`;
        return document.courseId ? `${base}?course=${encodeURIComponent(document.courseId)}` : base;
      }
    }
  }
  switch (state.path.kind) {
    case "home":
      return "/";
    case "courses":
      return "/courses";
    case "course":
      return `/courses/${encodeURIComponent(state.path.courseId)}`;
    case "course-mode":
      return `/courses/${encodeURIComponent(state.path.courseId)}/${state.path.mode}`;
    case "calendar":
      return "/calendar";
    case "chat":
      return "/chat";
  }
}

export function parseNavigatorLocation(pathname: string, search = ""): NavigatorState {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (segments.length === 0) {
    return hasLegacySearchParams(params) ? legacyNavigatorState(params) : homeState();
  }

  if (segments[0] === "courses") {
    const courseId = segments[1];
    if (!courseId) {
      return { path: { kind: "courses" }, document: null };
    }
    const mode = segments[2];
    if (!mode) {
      return { path: { kind: "course", courseId }, document: null };
    }
    if (mode === "formula") {
      return openDocument(homeState(), { kind: "formula", courseId });
    }
    if (!DRILLABLE_COURSE_MODES.has(mode)) {
      return { path: { kind: "course", courseId }, document: null };
    }
    const drillMode = mode as DrillableCourseMode;
    const resourceId = segments[3];
    if (!resourceId || drillMode === "pipeline") {
      return { path: { kind: "course-mode", courseId, mode: drillMode }, document: null };
    }
    const document: NavigatorDocument =
      drillMode === "materials"
        ? { kind: "material", courseId, materialId: resourceId }
        : drillMode === "tasks"
          ? { kind: "task", courseId, taskId: resourceId }
          : drillMode === "script"
            ? { kind: "script-section", courseId, sectionId: resourceId }
            : { kind: "recording", courseId, recordingId: resourceId };
    return openDocument(homeState(), document);
  }

  if (segments[0] === "calendar") {
    if (segments[1] === "grid") {
      return openDocument(homeState(), { kind: "calendar-grid" });
    }
    if (segments[1] === "events" && segments[2]) {
      return openDocument(homeState(), { kind: "calendar-event", eventUid: segments[2] });
    }
    return { path: { kind: "calendar" }, document: null };
  }

  if (segments[0] === "chat") {
    const courseId = cleanParam(params.get("course"));
    if (!segments[1]) {
      return { path: { kind: "chat" }, document: null };
    }
    const sessionId = segments[1] === "new" ? null : segments[1];
    return openDocument(homeState(), { kind: "chat-session", sessionId, courseId });
  }

  return homeState();
}

// Converts the previous route model (also produced by the legacy ?course=…
// query URLs) into navigator states so old links keep working.
export function navigatorStateFromDashboardRoute(route: DashboardRoute): NavigatorState {
  if (route.homeView === "chat") {
    return openDocument(homeState(), {
      kind: "chat-session",
      sessionId: null,
      courseId: route.courseId,
    });
  }
  if (route.homeView === "calendar") {
    return openDocument(homeState(), { kind: "calendar-grid" });
  }
  if (!route.courseId) {
    return { path: { kind: "courses" }, document: null };
  }
  if (route.courseHubOpen) {
    return { path: { kind: "course", courseId: route.courseId }, document: null };
  }
  if (route.mode === "formula") {
    return openDocument(homeState(), { kind: "formula", courseId: route.courseId });
  }
  if (route.mode === "materials" && route.materialId) {
    return openDocument(homeState(), { kind: "material", courseId: route.courseId, materialId: route.materialId });
  }
  if (route.mode === "tasks" && route.taskId) {
    return openDocument(homeState(), { kind: "task", courseId: route.courseId, taskId: route.taskId });
  }
  if (route.mode === "script" && route.sectionId) {
    return openDocument(homeState(), { kind: "script-section", courseId: route.courseId, sectionId: route.sectionId });
  }
  if (route.mode === "recordings" && route.recordingId) {
    return openDocument(homeState(), { kind: "recording", courseId: route.courseId, recordingId: route.recordingId });
  }
  return {
    path: { kind: "course-mode", courseId: route.courseId, mode: route.mode as DrillableCourseMode },
    document: null,
  };
}

export type NavigatorLabelResolvers = {
  calendarEventTitle?: (eventUid: string) => string | null | undefined;
  chatSessionTitle?: (sessionId: string) => string | null | undefined;
  courseTitle?: (courseId: string) => string | null | undefined;
  materialName?: (courseId: string, materialId: string) => string | null | undefined;
  recordingTitle?: (courseId: string, recordingId: string) => string | null | undefined;
  scriptSectionTitle?: (courseId: string, sectionId: string) => string | null | undefined;
  taskTitle?: (courseId: string, taskId: string) => string | null | undefined;
};

export type NavigatorBreadcrumb = {
  id: string;
  label: string;
  target: NavigatorState;
};

export function navigatorBreadcrumbs(
  state: NavigatorState,
  resolvers: NavigatorLabelResolvers = {},
): NavigatorBreadcrumb[] {
  const crumbs: NavigatorBreadcrumb[] = [{ id: "home", label: "Start", target: homeState() }];
  const { path, document } = state;

  function pushCoursesTrail(courseId: string) {
    crumbs.push({ id: "courses", label: "Kurse", target: { path: { kind: "courses" }, document: null } });
    crumbs.push({
      id: `course:${courseId}`,
      label: resolvers.courseTitle?.(courseId) || "Kurs",
      target: { path: { kind: "course", courseId }, document: null },
    });
  }

  switch (path.kind) {
    case "home":
      break;
    case "courses":
      crumbs.push({ id: "courses", label: "Kurse", target: { path, document: null } });
      break;
    case "course":
      pushCoursesTrail(path.courseId);
      break;
    case "course-mode":
      pushCoursesTrail(path.courseId);
      crumbs.push({
        id: `mode:${path.mode}`,
        label: COURSE_MODE_LABELS[path.mode],
        target: { path, document: null },
      });
      break;
    case "calendar":
      crumbs.push({ id: "calendar", label: "Kalender", target: { path, document: null } });
      break;
    case "chat":
      crumbs.push({ id: "chat", label: "Chat", target: { path, document: null } });
      break;
  }

  if (document) {
    crumbs.push({
      id: `document:${document.kind}`,
      label: documentLabel(document, resolvers),
      target: state,
    });
  }

  return crumbs;
}

function documentLabel(document: NavigatorDocument, resolvers: NavigatorLabelResolvers): string {
  switch (document.kind) {
    case "material":
      return resolvers.materialName?.(document.courseId, document.materialId) || "Material";
    case "task":
      return resolvers.taskTitle?.(document.courseId, document.taskId) || "Aufgabe";
    case "script-section":
      return resolvers.scriptSectionTitle?.(document.courseId, document.sectionId) || "Abschnitt";
    case "formula":
      return COURSE_MODE_LABELS.formula;
    case "recording":
      return resolvers.recordingTitle?.(document.courseId, document.recordingId) || "Video";
    case "calendar-grid":
      return "Kalenderansicht";
    case "calendar-event":
      return resolvers.calendarEventTitle?.(document.eventUid) || "Termin";
    case "chat-session":
      return document.sessionId === null
        ? "Neuer Chat"
        : resolvers.chatSessionTitle?.(document.sessionId) || "Chat";
  }
}

function hasLegacySearchParams(params: URLSearchParams): boolean {
  return (
    params.has("course") ||
    params.get("view") === "calendar" ||
    params.has("mode") ||
    params.has("material") ||
    params.has("task") ||
    params.has("section") ||
    params.has("recording")
  );
}

function legacyNavigatorState(params: URLSearchParams): NavigatorState {
  return navigatorStateFromDashboardRoute(parseDashboardRouteSearch(`?${params.toString()}`));
}

function cleanParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
