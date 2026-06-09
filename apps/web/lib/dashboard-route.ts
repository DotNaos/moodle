import type { StudyMode } from "@/components/study-mode-actions";

const ROUTABLE_STUDY_MODES = new Set<StudyMode>(["materials", "tasks", "script", "formula", "recordings"]);

const STUDY_MODE_SEGMENTS: Record<StudyMode, string> = {
  materials: "materials",
  tasks: "tasks",
  script: "script",
  formula: "formula",
  recordings: "recordings",
};

const SEGMENT_TO_STUDY_MODE = Object.fromEntries(
  Object.entries(STUDY_MODE_SEGMENTS).map(([mode, segment]) => [segment, mode as StudyMode]),
) as Record<string, StudyMode>;

export type DashboardRoute = {
  codexOpen: boolean;
  courseHubOpen: boolean;
  courseId: string | null;
  homeView: "courses" | "calendar";
  materialId: string | null;
  mode: StudyMode;
  recordingId: string | null;
  sectionId: string | null;
  taskId: string | null;
};

export type DashboardRouteURLInput = {
  codexOpen: boolean;
  courseHubOpen: boolean;
  homeView: "courses" | "calendar";
  navigationMode: "courses" | "materials";
  recordingId: string | null;
  selectedCourseId: string | null;
  selectedMaterialId: string | null;
  selectedScriptSectionId: string | null;
  selectedTaskId: string | null;
  studyMode: StudyMode;
};

export function readDashboardRoute(): DashboardRoute {
  if (typeof window === "undefined") {
    return defaultDashboardRoute();
  }
  return parseDashboardRoute(window.location.pathname, window.location.search);
}

export function readDashboardLocation(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.pathname + window.location.search;
}

export function parseDashboardRoute(pathname: string, search = ""): DashboardRoute {
  const legacyRoute = parseLegacyDashboardRouteSearch(search);
  if (legacyRoute) {
    return legacyRoute;
  }
  return parseDashboardRoutePath(pathname, search);
}

export function parseDashboardRouteSearch(search: string): DashboardRoute {
  return parseDashboardRoute("/", search);
}

export function parseDashboardRoutePath(pathname: string, search = ""): DashboardRoute {
  const params = new URLSearchParams(search);
  const codexOpen = params.get("codex") === "1";
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (segments.length === 0) {
    return { ...defaultDashboardRoute(), codexOpen };
  }

  if (segments[0] === "calendar") {
    return {
      ...defaultDashboardRoute(),
      codexOpen,
      homeView: "calendar",
    };
  }

  if (segments[0] === "courses" && segments[1]) {
    const courseId = decodeURIComponent(segments[1]);
    const modeSegment = segments[2];

    if (!modeSegment) {
      return {
        codexOpen,
        courseHubOpen: false,
        courseId,
        homeView: "courses",
        materialId: null,
        mode: "materials",
        recordingId: null,
        sectionId: null,
        taskId: null,
      };
    }

    const mode = SEGMENT_TO_STUDY_MODE[modeSegment];
    if (!mode) {
      return { ...defaultDashboardRoute(), codexOpen };
    }

    const resourceId = segments[3] ? decodeURIComponent(segments[3]) : null;

    return {
      codexOpen,
      courseHubOpen: false,
      courseId,
      homeView: "courses",
      materialId: mode === "materials" ? resourceId : null,
      mode,
      recordingId: mode === "recordings" ? resourceId : null,
      sectionId: mode === "script" ? resourceId : null,
      taskId: mode === "tasks" ? resourceId : null,
    };
  }

  return { ...defaultDashboardRoute(), codexOpen };
}

export function defaultDashboardRoute(): DashboardRoute {
  return {
    codexOpen: false,
    courseHubOpen: true,
    courseId: null,
    homeView: "courses",
    materialId: null,
    mode: "materials",
    recordingId: null,
    sectionId: null,
    taskId: null,
  };
}

export function buildDashboardRouteURL({
  codexOpen,
  courseHubOpen,
  homeView,
  navigationMode,
  recordingId,
  selectedCourseId,
  selectedMaterialId,
  selectedScriptSectionId,
  selectedTaskId,
  studyMode,
}: DashboardRouteURLInput): string {
  if (navigationMode === "courses" || !selectedCourseId) {
    if (homeView === "calendar") {
      return withCodexQuery("/calendar", codexOpen);
    }
    return withCodexQuery("/", codexOpen);
  }

  const courseBase = `/courses/${encodeURIComponent(selectedCourseId)}`;
  if (courseHubOpen) {
    return withCodexQuery(courseBase, codexOpen);
  }

  const modeSegment = STUDY_MODE_SEGMENTS[studyMode];
  const nestedId =
    studyMode === "materials"
      ? selectedMaterialId
      : studyMode === "tasks"
        ? selectedTaskId
        : studyMode === "script"
          ? selectedScriptSectionId
          : studyMode === "recordings"
            ? recordingId
            : null;

  if (nestedId) {
    return withCodexQuery(`${courseBase}/${modeSegment}/${encodeURIComponent(nestedId)}`, codexOpen);
  }

  return withCodexQuery(`${courseBase}/${modeSegment}`, codexOpen);
}

export function dashboardRouteLocation(route: DashboardRouteURLInput): string {
  return buildDashboardRouteURL(route);
}

export function dashboardRouteFromInput({
  codexOpen,
  courseHubOpen,
  homeView,
  navigationMode,
  recordingId,
  selectedCourseId,
  selectedMaterialId,
  selectedScriptSectionId,
  selectedTaskId,
  studyMode,
}: DashboardRouteURLInput): DashboardRoute {
  if (navigationMode === "courses" || !selectedCourseId) {
    return {
      codexOpen,
      courseHubOpen: true,
      courseId: null,
      homeView,
      materialId: null,
      mode: "materials",
      recordingId: null,
      sectionId: null,
      taskId: null,
    };
  }

  return {
    codexOpen,
    courseHubOpen,
    courseId: selectedCourseId,
    homeView,
    materialId: studyMode === "materials" ? selectedMaterialId : null,
    mode: studyMode,
    recordingId: studyMode === "recordings" ? recordingId : null,
    sectionId: studyMode === "script" ? selectedScriptSectionId : null,
    taskId: studyMode === "tasks" ? selectedTaskId : null,
  };
}

export function dashboardRoutesEqual(left: DashboardRoute, right: DashboardRoute): boolean {
  return (
    left.codexOpen === right.codexOpen &&
    left.courseHubOpen === right.courseHubOpen &&
    left.courseId === right.courseId &&
    left.homeView === right.homeView &&
    left.materialId === right.materialId &&
    left.mode === right.mode &&
    left.recordingId === right.recordingId &&
    left.sectionId === right.sectionId &&
    left.taskId === right.taskId
  );
}

export function routeInputFromDashboardRoute(route: DashboardRoute): DashboardRouteURLInput {
  return {
    codexOpen: route.codexOpen,
    courseHubOpen: route.courseHubOpen,
    homeView: route.homeView,
    navigationMode: route.courseId ? "materials" : "courses",
    recordingId: route.recordingId,
    selectedCourseId: route.courseId,
    selectedMaterialId: route.materialId,
    selectedScriptSectionId: route.sectionId,
    selectedTaskId: route.taskId,
    studyMode: route.mode,
  };
}

function parseLegacyDashboardRouteSearch(search: string): DashboardRoute | null {
  const params = new URLSearchParams(search);
  const hasLegacyParams =
    params.has("course") ||
    params.get("view") === "calendar" ||
    params.has("mode") ||
    params.has("material") ||
    params.has("task") ||
    params.has("section") ||
    params.has("recording");

  if (!hasLegacyParams) {
    return null;
  }

  const modeParam = params.get("mode");
  const mode: StudyMode =
    modeParam && ROUTABLE_STUDY_MODES.has(modeParam as StudyMode) ? (modeParam as StudyMode) : "materials";
  const courseId = cleanRouteParam(params.get("course"));

  return {
    codexOpen: params.get("codex") === "1",
    courseHubOpen: Boolean(courseId) && !params.get("mode"),
    courseId,
    homeView: params.get("view") === "calendar" ? "calendar" : "courses",
    materialId: cleanRouteParam(params.get("material")),
    mode: courseId ? mode : "materials",
    recordingId: cleanRouteParam(params.get("recording")),
    sectionId: cleanRouteParam(params.get("section")),
    taskId: cleanRouteParam(params.get("task")),
  };
}

function withCodexQuery(path: string, codexOpen: boolean): string {
  if (!codexOpen) {
    return path;
  }
  return `${path}?codex=1`;
}

function cleanRouteParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
