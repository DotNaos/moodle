"use client";

import { Bot, Menu } from "lucide-react";
import { Show, useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FullPageLoading, SignedOutHome } from "@/components/home-states";
import { DashboardNavBreadcrumb } from "@/components/dashboard-nav-breadcrumb";
import { HeaderActionsMenu } from "@/components/header-actions-menu";
import { CodexPanel } from "@/components/codex-panel";
import { CourseMainPanel } from "@/components/course-main-panel";
import { CoursesHomePanel } from "@/components/courses-home-panel";
import { HomeSidebar } from "@/components/home-sidebar";
import { MobileBottomNav, type MobileMoodleTab } from "@/components/mobile-bottom-nav";
import { MoodleConnectCard } from "@/components/moodle-connect-card";
import { CourseSidebar } from "@/components/course-sidebar";
import type { StudyMode } from "@/components/study-mode-actions";
import { useCodexMoodleActions } from "@/hooks/use-codex-moodle-actions";
import { replaceDashboardLocation, useDashboardRouteHydration } from "@/hooks/use-dashboard-url";
import { useWebexRecordings } from "@/hooks/use-webex-recordings";
import { clearDashboardCache, readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
import type { Course, Material, User } from "@/lib/dashboard-data";
import {
  buildCategoryOptionGroups,
  buildCourseGroups,
  courseCategoryKey,
  courseSubtitle,
  courseTitle,
  normalizeCourses,
  normalizeMaterials,
} from "@/lib/dashboard-data";
import {
  dashboardRouteFromInput,
  dashboardRoutesEqual,
  defaultDashboardRoute,
  parseDashboardRoute,
  type DashboardRoute,
  type DashboardRouteURLInput,
} from "@/lib/dashboard-route";
import {
  apiRequest,
  getErrorMessage,
  getMoodleConnectionMessage,
  isMoodleNotConnected,
  pruneMaterialCache,
} from "@/lib/moodle-api";
import type { PDFScrollCommand, PDFViewState } from "@/lib/pdf-context";
import { EMPTY_STUDY_OUTLINE, type StudyOutline } from "@/lib/study-outline";
import { cn } from "@/lib/utils";

const MOODLE_SERVICES_URL = process.env.NEXT_PUBLIC_MOODLE_SERVICES_URL ?? "https://moodle-services.os-home.net";

export default function Home() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const applyDashboardRouteRef = useRef<(route: DashboardRoute) => void>(() => {});
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsByCourseId, setMaterialsByCourseId] = useState<Record<string, Material[]>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>("materials");
  const [navigationMode, setNavigationMode] = useState<"courses" | "materials">("courses");
  const [homeView, setHomeView] = useState<"courses" | "calendar">("courses");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [courseHubOpen, setCourseHubOpen] = useState(true);
  const [mobileMaterialPreviewOpen, setMobileMaterialPreviewOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedScriptSectionId, setSelectedScriptSectionId] = useState<string | null>(null);
  const [studyOutline, setStudyOutline] = useState<StudyOutline>(EMPTY_STUDY_OUTLINE);
  const [pdfState, setPDFState] = useState<PDFViewState | null>(null);
  const [pdfScrollCommand, setPDFScrollCommand] = useState<PDFScrollCommand | null>(null);
  const materialsRequestId = useRef(0);
  const dashboardBootstrappedUserIdRef = useRef<string | null>(null);
  const {
    loadRecordings,
    recordingsByCourseId,
    resetRecordings,
    signInWebexBrowser,
    selectRecording,
    selectedRecordingForCourse,
  } = useWebexRecordings();
  const { applyCodexActions } = useCodexMoodleActions({
    courses,
    materials,
    materialsByCourseId,
    selectedCategory,
    selectedCourseId,
    user,
    userId,
    pdfState,
    loadMaterials,
    setError,
    setNavigationMode,
    setPDFScrollCommand,
    setSelectedCourseId,
    setSelectedMaterialId,
  });

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      dashboardBootstrappedUserIdRef.current = null;
      setUser(null);
      setCourses([]);
      setMaterials([]);
      setMaterialsByCourseId({});
      resetRecordings();
      setSelectedCourseId(null);
      setSelectedMaterialId(null);
      setStudyMode("materials");
      setSelectedTaskId(null);
      setSelectedScriptSectionId(null);
      setStudyOutline(EMPTY_STUDY_OUTLINE);
      setNavigationMode("courses");
      setHomeView("courses");
      setMobileMaterialPreviewOpen(false);
      setSelectedCategory("all");
      setError(null);
      setNeedsConnection(false);
      setConnectionMessage(null);
      return;
    }

    if (!userId) {
      return;
    }

    if (dashboardBootstrappedUserIdRef.current === userId) {
      return;
    }
    dashboardBootstrappedUserIdRef.current = userId;

    const initialRoute =
      typeof window === "undefined"
        ? defaultDashboardRoute()
        : parseDashboardRoute(window.location.pathname, window.location.search);
    const hasDeepLink = Boolean(initialRoute.courseId) || initialRoute.homeView === "calendar";

    const cached = readDashboardCache(userId);
    if (cached && !hasDeepLink) {
      setUser(cached.user);
      setCourses(cached.courses);
      setMaterialsByCourseId(cached.materialsByCourseId);
      setSelectedCategory(cached.selectedCategory);
      setNeedsConnection(false);
      setConnectionMessage(null);
      setError(null);
    }

    void loadDashboard({ background: Boolean(cached) });
  }, [isLoaded, isSignedIn, userId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const categoryOptionGroups = useMemo(() => buildCategoryOptionGroups(courses), [courses]);

  const selectedMaterial = useMemo(
    () => studyMode === "materials" ? materials.find((material) => material.id === selectedMaterialId) ?? null : null,
    [materials, selectedMaterialId, studyMode],
  );

  const selectedRecording = selectedRecordingForCourse(selectedCourseId);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const categoryFiltered =
      selectedCategory === "all"
        ? courses
        : courses.filter((course) => courseCategoryKey(course) === selectedCategory);

    if (!normalizedQuery) {
      return categoryFiltered;
    }

    return categoryFiltered.filter((course) =>
      [courseTitle(course), courseSubtitle(course), course.category, course.categoryName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [courses, query, selectedCategory]);

  const courseListGroups = useMemo(() => {
    if (selectedCategory === "all" && query.trim().length === 0) {
      return buildCourseGroups(filteredCourses).map((group) => ({
        key: group.key,
        label: group.label,
        courses: group.courses,
      }));
    }

    return [{ key: "filtered-courses", label: "", courses: filteredCourses }];
  }, [filteredCourses, query, selectedCategory]);

  const materialsBySection = useMemo(() => {
    const groups = new Map<string, Material[]>();
    for (const material of materials) {
      const section = material.sectionName?.trim() || "Materialien";
      groups.set(section, [...(groups.get(section) ?? []), material]);
    }
    return [...groups.entries()];
  }, [materials]);

  const mobileTab: MobileMoodleTab = codexOpen
    ? studyMode === "recordings"
      ? "recordings"
      : studyMode === "formula"
        ? "formula"
      : studyMode === "tasks"
        ? "tasks"
        : studyMode === "script"
          ? "script"
          : "materials"
    : studyMode === "tasks"
      ? "tasks"
      : studyMode === "script"
        ? "script"
        : studyMode === "formula"
          ? "formula"
        : studyMode === "recordings"
          ? "recordings"
          : "materials";
  const dashboardRouteInput = useMemo(
    () => ({
      codexOpen,
      courseHubOpen,
      homeView,
      navigationMode,
      recordingId: selectedRecording?.recordingUuid ?? null,
      selectedCourseId,
      selectedMaterialId,
      selectedScriptSectionId,
      selectedTaskId,
      studyMode,
    }),
    [
      codexOpen,
      courseHubOpen,
      homeView,
      navigationMode,
      selectedRecording?.recordingUuid,
      selectedCourseId,
      selectedMaterialId,
      selectedScriptSectionId,
      selectedTaskId,
      studyMode,
    ],
  );

  const dashboardRouteInputRef = useRef(dashboardRouteInput);
  dashboardRouteInputRef.current = dashboardRouteInput;

  const navigateDashboard = useCallback((patch: Partial<DashboardRouteURLInput>) => {
    replaceDashboardLocation(
      { ...dashboardRouteInputRef.current, ...patch },
      (route) => applyDashboardRouteRef.current(route),
    );
  }, []);

  function backToCourses() {
    setSidebarCollapsed(false);
    navigateDashboard({
      codexOpen: false,
      courseHubOpen: true,
      homeView: "courses",
      navigationMode: "courses",
      recordingId: null,
      selectedCourseId: null,
      selectedMaterialId: null,
      selectedScriptSectionId: null,
      selectedTaskId: null,
      studyMode: "materials",
    });
  }

  function openCourseRoot() {
    navigateDashboard({
      codexOpen: false,
      courseHubOpen: false,
      selectedMaterialId: null,
      selectedScriptSectionId: null,
      selectedTaskId: null,
      studyMode: "materials",
      recordingId: null,
    });
  }

  function openStudyModeRoot() {
    navigateDashboard({
      selectedMaterialId: null,
      selectedScriptSectionId: null,
      selectedTaskId: null,
      recordingId: null,
    });
  }

  function enterStudyMode(mode: StudyMode) {
    navigateDashboard({
      codexOpen: false,
      courseHubOpen: false,
      navigationMode: "materials",
      studyMode: mode,
      selectedMaterialId: null,
      selectedScriptSectionId: null,
      selectedTaskId: null,
      recordingId: null,
    });
  }

  const showHomeSidebar = navigationMode === "courses";
  const showCourseSidebar = navigationMode === "materials";
  const showSidebar = showHomeSidebar || showCourseSidebar;

  const navBreadcrumbProps = {
    coursesCount: courses.length,
    filteredCoursesCount: filteredCourses.length,
    courseHubOpen,
    homeView,
    navigationMode,
    selectedCourse,
    selectedMaterial,
    selectedScriptSectionId,
    selectedTaskId,
    studyMode,
    studyOutline,
    onBackToCourses: backToCourses,
    onOpenCourseRoot: openCourseRoot,
    onOpenStudyModeRoot: openStudyModeRoot,
  };

  async function loadDashboard(options: { background?: boolean } = {}) {
    if (!userId) {
      return;
    }

    materialsRequestId.current += 1;
    setLoading(!options.background && courses.length === 0);
    setRefreshing(options.background || courses.length > 0);
    setMaterialsLoading(false);
    setError(null);
    setConnectionMessage(null);

    try {
      const [userResponse, coursesResponse] = await Promise.all([
        apiRequest<User>("/me"),
        apiRequest<{ courses?: Course[] } | Course[]>("/courses"),
      ]);
      const courseList = normalizeCourses(coursesResponse);
      const nextMaterialsByCourseId = pruneMaterialCache(materialsByCourseId, courseList);
      const nextSelectedCategory =
        selectedCategory === "all" || courseList.some((course) => courseCategoryKey(course) === selectedCategory)
          ? selectedCategory
          : "all";
      const activeRoute =
        typeof window === "undefined"
          ? defaultDashboardRoute()
          : parseDashboardRoute(window.location.pathname, window.location.search);
      const preserveNavigation = Boolean(activeRoute.courseId);

      setUser(userResponse);
      setCourses(courseList);
      setMaterialsByCourseId(nextMaterialsByCourseId);
      setNeedsConnection(false);
      setConnectionMessage(null);
      setSelectedCategory(nextSelectedCategory);

      if (!preserveNavigation) {
        const nextSelectedCourseId =
          selectedCourseId && courseList.some((course) => String(course.id) === selectedCourseId)
            ? selectedCourseId
            : null;
        const nextMaterials = nextSelectedCourseId ? nextMaterialsByCourseId[nextSelectedCourseId] ?? [] : [];
        const nextSelectedMaterialId =
          selectedMaterialId && nextMaterials.some((material) => material.id === selectedMaterialId)
            ? selectedMaterialId
            : nextMaterials[0]?.id ?? null;

        setMaterials(nextMaterials);
        setSelectedCourseId(nextSelectedCourseId);
        setSelectedMaterialId(nextSelectedMaterialId);
        setStudyMode("materials");
        setSelectedTaskId(null);
        setSelectedScriptSectionId(null);
        setNavigationMode((current) => (nextSelectedCourseId && current === "materials" ? "materials" : "courses"));
        setHomeView("courses");
        setMobileMaterialPreviewOpen(Boolean(nextSelectedMaterialId));
        writeDashboardCache(userId, {
          user: userResponse,
          courses: courseList,
          materialsByCourseId: nextMaterialsByCourseId,
          selectedCourseId: nextSelectedCourseId,
          selectedCategory: nextSelectedCategory,
          selectedMaterialId: nextSelectedMaterialId,
        });
      } else {
        writeDashboardCache(userId, {
          user: userResponse,
          courses: courseList,
          materialsByCourseId: nextMaterialsByCourseId,
          selectedCourseId: selectedCourseId,
          selectedCategory: nextSelectedCategory,
          selectedMaterialId: selectedMaterialId,
        });
      }
    } catch (loadError) {
      if (isMoodleNotConnected(loadError)) {
        handleMoodleDisconnected(loadError);
      } else {
        setNeedsConnection(false);
        setConnectionMessage(null);
        setError(getErrorMessage(loadError));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMaterials(courseId: string, options: { resetNavigation?: boolean } = {}): Promise<Material[]> {
    const resetNavigation = options.resetNavigation !== false;
    const cachedMaterials = materialsByCourseId[courseId];
    if (cachedMaterials) {
      materialsRequestId.current += 1;
      setMaterialsLoading(false);
      setSelectedCourseId(courseId);
      setMaterials(cachedMaterials);
      if (resetNavigation) {
        setSelectedMaterialId(null);
        setStudyMode("materials");
        setSelectedTaskId(null);
        setSelectedScriptSectionId(null);
        setCourseHubOpen(true);
        setMobileMaterialPreviewOpen(false);
      }
      setNavigationMode("materials");
      setHomeView("courses");
      if (userId) {
        writeDashboardCache(userId, {
          user,
          courses,
          materialsByCourseId,
          selectedCourseId: courseId,
          selectedCategory,
          selectedMaterialId: null,
        });
      }
      return cachedMaterials;
    }

    setMaterialsLoading(true);
    setError(null);
    setSelectedCourseId(courseId);
    if (resetNavigation) {
      setStudyMode("materials");
      setSelectedTaskId(null);
      setSelectedScriptSectionId(null);
      setCourseHubOpen(true);
      setMobileMaterialPreviewOpen(false);
    }
    setNavigationMode("materials");
    setHomeView("courses");
    const requestId = materialsRequestId.current + 1;
    materialsRequestId.current = requestId;

    try {
      const response = await apiRequest<{ materials?: Material[] } | Material[]>(
        `/courses/${encodeURIComponent(courseId)}/materials`,
      );
      const nextMaterials = normalizeMaterials(response);
      if (materialsRequestId.current !== requestId) {
        return [];
      }
      setMaterials(nextMaterials);
      if (resetNavigation) {
        setSelectedMaterialId(null);
      }
      setMaterialsByCourseId((current) => ({
        ...current,
        [courseId]: nextMaterials,
      }));
      if (userId) {
        writeDashboardCache(userId, {
          user,
          courses,
          materialsByCourseId: {
            ...materialsByCourseId,
            [courseId]: nextMaterials,
          },
          selectedCourseId: courseId,
          selectedCategory,
          selectedMaterialId: null,
        });
      }
      return nextMaterials;
    } catch (loadError) {
      if (materialsRequestId.current !== requestId) {
        return [];
      }
      if (isMoodleNotConnected(loadError)) {
        handleMoodleDisconnected(loadError);
        return [];
      }
      setMaterials([]);
      setSelectedMaterialId(null);
      setError(getErrorMessage(loadError));
      return [];
    } finally {
      if (materialsRequestId.current === requestId) {
        setMaterialsLoading(false);
      }
    }
  }

  async function openRecordings(courseId: string, options: { refresh?: boolean } = {}) {
    setStudyMode("recordings");
    setSelectedMaterialId(null);
    setSelectedTaskId(null);
    setSelectedScriptSectionId(null);
    await loadRecordings(courseId, options);
  }

  const applyDashboardRoute = useCallback(
    async (route: DashboardRoute) => {
      if (dashboardRoutesEqual(route, dashboardRouteFromInput(dashboardRouteInputRef.current))) {
        return;
      }

      setCodexOpen(route.codexOpen);

      if (route.homeView === "calendar" && !route.courseId) {
        setNavigationMode("courses");
        setHomeView("calendar");
        setCourseHubOpen(true);
        setSelectedCourseId(null);
        setSelectedMaterialId(null);
        setSelectedTaskId(null);
        setSelectedScriptSectionId(null);
        setStudyOutline(EMPTY_STUDY_OUTLINE);
        setMobileMaterialPreviewOpen(false);
        return;
      }

      if (!route.courseId) {
        setNavigationMode("courses");
        setHomeView("courses");
        setCourseHubOpen(true);
        setSelectedCourseId(null);
        setSelectedMaterialId(null);
        setSelectedTaskId(null);
        setSelectedScriptSectionId(null);
        setStudyOutline(EMPTY_STUDY_OUTLINE);
        setMobileMaterialPreviewOpen(false);
        return;
      }

      if (courses.length > 0 && !courses.some((course) => String(course.id) === route.courseId)) {
        window.history.replaceState(
          { ...window.history.state, as: "/", url: "/" },
          "",
          "/",
        );
        void applyDashboardRouteRef.current(defaultDashboardRoute());
        return;
      }

      setSelectedCourseId(route.courseId);
      setNavigationMode("materials");
      setHomeView("courses");
      setCourseHubOpen(route.courseHubOpen);
      setStudyMode(route.mode);
      setSelectedTaskId(route.taskId);
      setSelectedScriptSectionId(route.sectionId);
      setSelectedMaterialId(route.materialId);
      setMobileMaterialPreviewOpen(Boolean(route.materialId));

      if (selectedCourseId !== route.courseId || !materialsByCourseId[route.courseId]) {
        await loadMaterials(route.courseId, { resetNavigation: false });
      } else {
        setSelectedCourseId(route.courseId);
        setMaterials(materialsByCourseId[route.courseId] ?? []);
      }

      if (route.mode === "recordings") {
        setStudyMode("recordings");
        setSelectedMaterialId(null);
        setSelectedTaskId(null);
        setSelectedScriptSectionId(null);
        const recordings = await loadRecordings(route.courseId);
        if (route.recordingId) {
          const recording =
            recordings.find((item) => item.recordingUuid === route.recordingId) ?? null;
          if (recording) {
            selectRecording(route.courseId, recording);
          }
        }
      }
    },
    [courses, loadRecordings, materialsByCourseId, selectRecording, selectedCourseId],
  );

  applyDashboardRouteRef.current = (route) => {
    void applyDashboardRoute(route);
  };

  useDashboardRouteHydration({
    enabled: Boolean(isSignedIn && userId && !needsConnection),
    applyRoute: applyDashboardRoute,
  });

  function clearMoodleWorkspace() {
    setUser(null);
    setCourses([]);
    setMaterials([]);
    setMaterialsByCourseId({});
    resetRecordings();
    setSelectedCourseId(null);
    setSelectedMaterialId(null);
    setStudyMode("materials");
    setSelectedTaskId(null);
    setSelectedScriptSectionId(null);
    setStudyOutline(EMPTY_STUDY_OUTLINE);
    setNavigationMode("courses");
    setHomeView("courses");
    setCourseHubOpen(true);
    setMobileMaterialPreviewOpen(false);
    setSelectedCategory("all");
    setMaterialsLoading(false);
  }

  function handleMoodleDisconnected(disconnectError: unknown) {
    materialsRequestId.current += 1;
    if (userId) {
      clearDashboardCache(userId);
    }
    clearMoodleWorkspace();
    setNeedsConnection(true);
    setConnectionMessage(getMoodleConnectionMessage(disconnectError));
    setError(null);
  }

  if (!isLoaded) {
    return <FullPageLoading />;
  }

  return (
    <>
      <Show when="signed-out">
        <SignedOutHome moodleServicesUrl={MOODLE_SERVICES_URL} />
      </Show>

      <Show when="signed-in">
        <main className="min-h-dvh overflow-x-hidden px-3 py-2 sm:px-4 sm:py-3 md:h-dvh md:max-h-dvh md:overflow-hidden md:p-0">
          <div
            className={cn(
              "mx-auto grid min-h-full w-full min-w-0 max-w-[1680px] gap-2 md:mx-0 md:h-full md:max-w-none md:gap-0",
              error ? "md:grid-rows-[auto_minmax(0,1fr)]" : "md:grid-rows-[minmax(0,1fr)]",
            )}
          >
            <DashboardHeader
              className="md:hidden"
              codexOpen={codexOpen}
              loading={loading}
              navBreadcrumb={navBreadcrumbProps}
              refreshing={refreshing}
              user={user}
              onToggleCodex={() => navigateDashboard({ codexOpen: !codexOpen })}
              onRefresh={() => void loadDashboard()}
            />

            {error ? <DashboardNotice message={error} /> : null}

            {needsConnection ? (
              <section className="min-h-0 overflow-auto py-4">
                <MoodleConnectCard
                  reason={connectionMessage}
                  onConnected={() => {
                    setNeedsConnection(false);
                    setConnectionMessage(null);
                    void loadDashboard();
                  }}
                />
              </section>
            ) : (
              <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 pb-24 md:h-full md:min-h-0 md:gap-0 md:overflow-hidden md:bg-background md:pb-0">
                <DashboardHeader
                  className="hidden shrink-0 border-b border-border px-4 py-2.5 md:flex md:pl-4 md:pr-4"
                  codexOpen={codexOpen}
                  loading={loading}
                  navBreadcrumb={navBreadcrumbProps}
                  refreshing={refreshing}
                  sidebarCollapsed={sidebarCollapsed}
                  user={user}
                  onToggleCodex={() => navigateDashboard({ codexOpen: !codexOpen })}
                  onRefresh={() => void loadDashboard()}
                  onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
                />
                <div
                  className={cn(
                    "grid min-h-0 w-full min-w-0 flex-1 gap-3 md:items-stretch md:gap-0 md:overflow-hidden",
                    showSidebar
                      ? sidebarCollapsed
                        ? codexOpen
                          ? "md:grid-cols-[88px_minmax(0,1fr)_420px]"
                          : "md:grid-cols-[88px_minmax(0,1fr)]"
                        : codexOpen
                          ? "md:grid-cols-[220px_minmax(0,1fr)_420px]"
                          : "md:grid-cols-[220px_minmax(0,1fr)]"
                      : codexOpen
                        ? "md:grid-cols-[minmax(0,1fr)_420px]"
                        : "md:grid-cols-[minmax(0,1fr)]",
                  )}
                >
                {showHomeSidebar ? (
                  <HomeSidebar
                    homeView={homeView}
                    sidebarCollapsed={sidebarCollapsed}
                    onHomeViewChange={(value) => {
                      navigateDashboard({
                        codexOpen: false,
                        courseHubOpen: true,
                        homeView: value,
                        navigationMode: "courses",
                        recordingId: null,
                        selectedCourseId: null,
                        selectedMaterialId: null,
                        selectedScriptSectionId: null,
                        selectedTaskId: null,
                        studyMode: "materials",
                      });
                    }}
                  />
                ) : null}
                {showCourseSidebar ? (
                  <CourseSidebar
                    courseHubOpen={courseHubOpen}
                    sidebarCollapsed={sidebarCollapsed}
                    studyMode={studyMode}
                    onFormula={() => enterStudyMode("formula")}
                    onMaterials={() => enterStudyMode("materials")}
                    onRecordings={() => enterStudyMode("recordings")}
                    onScript={() => enterStudyMode("script")}
                    onTasks={() => enterStudyMode("tasks")}
                  />
                ) : null}

                <div className="min-h-0 min-w-0 md:h-full md:min-h-0 md:overflow-hidden">
                  {navigationMode === "courses" ? (
                    <CoursesHomePanel
                      categoryOptionGroups={categoryOptionGroups}
                      courseListGroups={courseListGroups}
                      filteredCoursesCount={filteredCourses.length}
                      homeView={homeView}
                      loading={loading}
                      query={query}
                      selectedCategory={selectedCategory}
                      selectedCourseId={selectedCourseId}
                      onCategoryChange={(value) => {
                        materialsRequestId.current += 1;
                        setMaterialsLoading(false);
                        setSelectedCategory(value);
                        setMaterials([]);
                        navigateDashboard({
                          codexOpen: false,
                          courseHubOpen: true,
                          homeView: "courses",
                          navigationMode: "courses",
                          recordingId: null,
                          selectedCourseId: null,
                          selectedMaterialId: null,
                          selectedScriptSectionId: null,
                          selectedTaskId: null,
                          studyMode: "materials",
                        });
                      }}
                      onHomeViewChange={(value) => {
                        navigateDashboard({
                          codexOpen: false,
                          courseHubOpen: true,
                          homeView: value,
                          navigationMode: "courses",
                          recordingId: null,
                          selectedCourseId: null,
                          selectedMaterialId: null,
                          selectedScriptSectionId: null,
                          selectedTaskId: null,
                          studyMode: "materials",
                        });
                      }}
                      onQueryChange={setQuery}
                      onSelectCourse={(courseId) => {
                        navigateDashboard({
                          codexOpen: false,
                          courseHubOpen: false,
                          homeView: "courses",
                          navigationMode: "materials",
                          recordingId: null,
                          selectedCourseId: courseId,
                          selectedMaterialId: null,
                          selectedScriptSectionId: null,
                          selectedTaskId: null,
                          studyMode: "materials",
                        });
                      }}
                    />
                  ) : (
                  <CourseMainPanel
                    course={selectedCourse}
                    courseHubOpen={courseHubOpen}
                    courseId={selectedCourseId}
                    materials={materials}
                    materialsBySection={materialsBySection}
                    materialsLoading={materialsLoading}
                    material={selectedMaterial}
                    recordingsState={selectedCourseId ? recordingsByCourseId[selectedCourseId] : undefined}
                    selectedScriptSectionId={selectedScriptSectionId}
                    selectedRecording={selectedRecording}
                    selectedTaskId={selectedTaskId}
                    studyMode={studyMode}
                    studyOutline={studyOutline}
                    onEnterStudyMode={enterStudyMode}
                    onSelectMaterial={(material) => {
                      navigateDashboard({
                        codexOpen: false,
                        courseHubOpen: false,
                        studyMode: "materials",
                        selectedMaterialId: material.id,
                        selectedScriptSectionId: null,
                        selectedTaskId: null,
                      });
                      if (userId) {
                        writeDashboardCache(userId, {
                          user,
                          courses,
                          materialsByCourseId,
                          selectedCourseId,
                          selectedCategory,
                          selectedMaterialId: material.id,
                        });
                      }
                    }}
                    onSelectScriptSection={(sectionId) => {
                      navigateDashboard({
                        courseHubOpen: false,
                        selectedScriptSectionId: sectionId,
                        selectedMaterialId: null,
                        selectedTaskId: null,
                        studyMode: "script",
                      });
                    }}
                    onSelectTask={(taskId) => {
                      navigateDashboard({
                        courseHubOpen: false,
                        selectedTaskId: taskId,
                        selectedMaterialId: null,
                        selectedScriptSectionId: null,
                        studyMode: "tasks",
                      });
                    }}
                    onOpenResource={(resourceId) => {
                      const material = materials.find((item) => item.id === resourceId);
                      if (!material) {
                        setError(`Could not find Moodle resource ${resourceId} in the loaded course materials.`);
                        return;
                      }
                      navigateDashboard({
                        courseHubOpen: false,
                        navigationMode: "materials",
                        selectedMaterialId: material.id,
                        selectedScriptSectionId: null,
                        selectedTaskId: null,
                        studyMode: "materials",
                      });
                      setError(null);
                      if (userId) {
                        writeDashboardCache(userId, {
                          user,
                          courses,
                          materialsByCourseId,
                          selectedCourseId,
                          selectedCategory,
                          selectedMaterialId: material.id,
                        });
                      }
                    }}
                    onPDFStateChange={setPDFState}
                    onLoadRecordings={() => selectedCourseId && void openRecordings(selectedCourseId, { refresh: true })}
                    onPlayRecording={(recording) => {
                      if (!selectedCourseId) {
                        return;
                      }
                      selectRecording(selectedCourseId, recording);
                      navigateDashboard({
                        courseHubOpen: false,
                        recordingId: recording.recordingUuid,
                        selectedMaterialId: null,
                        selectedScriptSectionId: null,
                        selectedTaskId: null,
                        studyMode: "recordings",
                      });
                    }}
                    onSelectedScriptSectionIdChange={(sectionId) => {
                      navigateDashboard({
                        courseHubOpen: false,
                        selectedScriptSectionId: sectionId,
                        selectedMaterialId: null,
                        selectedTaskId: null,
                        studyMode: "script",
                      });
                    }}
                    onSelectedTaskIdChange={(taskId) => {
                      navigateDashboard({
                        courseHubOpen: false,
                        selectedTaskId: taskId,
                        selectedMaterialId: null,
                        selectedScriptSectionId: null,
                        studyMode: "tasks",
                      });
                    }}
                    onSignInWebexBrowser={(credentials) => {
                      if (!selectedCourseId) {
                        return Promise.reject(new Error("Choose a course before signing in to Webex."));
                      }
                      return signInWebexBrowser(selectedCourseId, credentials);
                    }}
                    onStudyOutlineChange={setStudyOutline}
                    pdfScrollCommand={pdfScrollCommand}
                  />
                  )}
                </div>
                {codexOpen ? (
                  <CodexPanel
                    courses={courses}
                    materials={materials}
                    onApplyActions={applyCodexActions}
                    pdfState={pdfState}
                    selectedCourse={selectedCourse}
                    selectedMaterial={selectedMaterial}
                    user={user}
                  />
                ) : null}
                </div>
              </section>
            )}
            {!needsConnection && selectedCourseId && navigationMode === "materials" ? (
              <MobileBottomNav
                activeTab={mobileTab}
                onMaterials={() => enterStudyMode("materials")}
                onTasks={() => enterStudyMode("tasks")}
                onScript={() => enterStudyMode("script")}
                onFormula={() => enterStudyMode("formula")}
                onRecordings={() => enterStudyMode("recordings")}
              />
            ) : null}
          </div>
        </main>
      </Show>
    </>
  );
}

type NavBreadcrumbProps = ComponentProps<typeof DashboardNavBreadcrumb>;

function DashboardHeader({
  className,
  codexOpen,
  loading,
  navBreadcrumb,
  refreshing,
  sidebarCollapsed,
  user,
  onToggleCodex,
  onRefresh,
  onToggleSidebar,
}: {
  className?: string;
  codexOpen: boolean;
  loading: boolean;
  navBreadcrumb: NavBreadcrumbProps;
  refreshing: boolean;
  sidebarCollapsed?: boolean;
  user: User | null;
  onToggleCodex: () => void;
  onRefresh: () => void;
  onToggleSidebar?: () => void;
}) {
  return (
    <header className={cn("flex min-h-0 w-full min-w-0 items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onToggleSidebar ? (
          <Button
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0"
            onClick={onToggleSidebar}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Menu aria-hidden />
          </Button>
        ) : null}
        <DashboardNavBreadcrumb {...navBreadcrumb} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          className="h-11 px-4"
          onClick={onToggleCodex}
          type="button"
          variant={codexOpen ? "default" : "secondary"}
        >
          <Bot aria-hidden />
          <span className="hidden sm:inline">Codex</span>
        </Button>
        <HeaderActionsMenu
          loading={loading}
          refreshing={refreshing}
          user={user}
          onRefresh={onRefresh}
        />
      </div>
    </header>
  );
}

function DashboardNotice({ message }: { message: string }) {
  return (
    <div className="min-w-0">
      <Alert className="inline-flex max-w-3xl items-start rounded-2xl px-4 py-3 text-sm font-medium leading-6">
        {message}
      </Alert>
    </div>
  );
}
