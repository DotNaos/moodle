"use client";

import { FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { CourseHero } from "@/components/course-hero";
import { CoursePipelineInspector } from "@/components/course-pipeline-inspector";
import { MaterialsOutline, TaskOutline } from "@/components/course-study-outline";
import { FileViewer } from "@/components/file-viewer";
import { FormulaCollectionPanel } from "@/components/formula-collection-panel";
import { StudyPipelineAction } from "@/components/study-pipeline-action";
import { buildScriptPDFMapping, TaskStudyPanel, type TaskViewResponse } from "@/components/task-study-panel";
import { WebexRecordingsPanel } from "@/components/webex-recordings-panel";
import type { StudyTestContext } from "@/lib/codex-chat";
import type { Course, Material, WebexRecording, WebexRecordingState } from "@/lib/dashboard-data";
import type { CourseResourcesLayout } from "@/lib/material-display-preferences";
import type { MaterialTypeFilter } from "@/lib/material-filters";
import type { PDFScrollCommand, PDFViewState } from "@/lib/pdf-context";
import type { StudyOutline } from "@/lib/study-outline";
import type { StudyMode } from "@/components/study-mode-actions";
import { buildTaskLinksByResourceId, taskIdForMaterial } from "@/lib/task-material-links";

export function CourseMainPanel({
  course,
  courseHubOpen,
  courseId,
  material,
  materialLayout,
  materialTypeFilter,
  materials,
  materialsBySection,
  materialsLoading,
  recordingsState,
  selectedRecording,
  studyMode,
  studyOutline,
  pdfScrollCommand,
  onPDFStateChange,
  onOpenResource,
  onLoadRecordings,
  onMaterialLayoutChange,
  onMaterialTypeFilterChange,
  onPlayRecording,
  onSelectMaterial,
  onSelectScriptSection,
  onSelectTask,
  onTaskStatusChange,
  onSelectedScriptSectionIdChange,
  onSelectedTaskIdChange,
  onSignInWebexBrowser,
  onStudyOutlineChange,
  onTaskViewChange,
  onTestActivityChange,
  taskViewOverride,
  selectedScriptSectionId,
  selectedTaskId,
}: {
  course: Course | null;
  courseHubOpen: boolean;
  courseId: string | null;
  material: Material | null;
  materialLayout: CourseResourcesLayout;
  materialTypeFilter: MaterialTypeFilter;
  materials: Material[];
  materialsBySection: [string, Material[]][];
  materialsLoading: boolean;
  recordingsState?: WebexRecordingState;
  selectedScriptSectionId: string | null;
  selectedRecording: WebexRecording | null;
  selectedTaskId: string | null;
  studyMode: StudyMode;
  studyOutline: StudyOutline;
  pdfScrollCommand: PDFScrollCommand | null;
  onEnterStudyMode: (mode: StudyMode) => void;
  onOpenResource: (resourceId: string) => void;
  onPDFStateChange: (state: PDFViewState | null) => void;
  onLoadRecordings: () => void;
  onMaterialLayoutChange: (layout: CourseResourcesLayout) => void;
  onMaterialTypeFilterChange: (filter: MaterialTypeFilter) => void;
  onPlayRecording: (recording: WebexRecording) => void;
  onSelectMaterial: (material: Material) => void;
  onSelectScriptSection: (sectionId: string) => void;
  onSelectTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: "done" | "open") => void;
  onSelectedScriptSectionIdChange: (sectionId: string | null) => void;
  onSelectedTaskIdChange: (taskId: string | null) => void;
  onSignInWebexBrowser: (credentials: { username: string; password: string }) => Promise<void>;
  onStudyOutlineChange: (outline: StudyOutline) => void;
  onTaskViewChange?: (view: TaskViewResponse | null) => void;
  onTestActivityChange?: (test: StudyTestContext | null) => void;
  taskViewOverride?: TaskViewResponse;
}) {
  const [taskView, setTaskView] = useState<TaskViewResponse | null>(null);
  const handleTaskViewChange = useCallback((view: TaskViewResponse | null) => {
    setTaskView(view);
    onTaskViewChange?.(view);
  }, [onTaskViewChange]);
  const pdfMapping = useMemo(
    () => (taskView ? buildScriptPDFMapping(taskView.scriptMarkdown, taskView.resources) : []),
    [taskView],
  );
  const taskLinksByResourceId = useMemo(
    () => buildTaskLinksByResourceId(studyOutline.tasks, taskView),
    [studyOutline.tasks, taskView],
  );

  useEffect(() => {
    setTaskView(null);
    onTaskViewChange?.(null);
  }, [courseId, onTaskViewChange]);

  if (studyMode === "pipeline") {
    return courseId ? (
      <CoursePipelineInspector course={course ?? courseFallbackFromRoute(courseId)} courseId={courseId} />
    ) : (
      <CoursePanelShell>
        <NoCourseSelected />
      </CoursePanelShell>
    );
  }

  if (!course) {
    return (
      <CoursePanelShell>
        <NoCourseSelected />
      </CoursePanelShell>
    );
  }

  if (courseHubOpen) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
        <div className="min-h-0 flex-1 overflow-auto">
          <CourseHero course={course} />
          <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-6">
            <p className="mb-5 text-sm text-muted-foreground">
              Materialien, Aufgaben, Script und mehr erreichst du über die Sidebar links.
            </p>
            {courseId ? <StudyPipelineAction courseId={courseId} /> : null}
          </div>
        </div>
      </section>
    );
  }

  if (studyMode === "recordings") {
    return (
      <section className="flex min-h-[60dvh] flex-col overflow-visible md:h-full md:min-h-0 md:overflow-hidden">
        <WebexRecordingsPanel
          course={course}
          state={recordingsState}
          selectedRecording={selectedRecording}
          onLoad={onLoadRecordings}
          onPlay={onPlayRecording}
          onSignInWebexBrowser={onSignInWebexBrowser}
        />
      </section>
    );
  }

  if (studyMode === "formula") {
    return (
      <section className="flex min-h-[60dvh] flex-col overflow-visible md:h-full md:min-h-0 md:overflow-hidden">
        {courseId ? (
          <FormulaCollectionPanel
            course={course}
            courseId={courseId}
            onTaskViewChange={handleTaskViewChange}
            pdfMapping={pdfMapping}
            view={taskView}
          />
        ) : (
          <NoCourseSelected />
        )}
      </section>
    );
  }

  if (studyMode === "materials") {
    if (material) {
      return (
        <section className="flex min-h-[70dvh] flex-col overflow-hidden md:h-full md:min-h-0">
          <FileViewer
            courseId={courseId}
            material={material}
            onPDFStateChange={onPDFStateChange}
            pdfScrollCommand={pdfScrollCommand}
          />
        </section>
      );
    }

    return (
      <CoursePanelShell course={course}>
        <MaterialsOutline
          layout={materialLayout}
          materials={materials}
          materialsBySection={materialsBySection}
          materialsLoading={materialsLoading}
          selectedMaterialId={null}
          taskIdForMaterial={(candidate) => taskIdForMaterial(candidate, taskLinksByResourceId)}
          typeFilter={materialTypeFilter}
          onLayoutChange={onMaterialLayoutChange}
          onOpenTask={onSelectTask}
          onSelectMaterial={onSelectMaterial}
          onTypeFilterChange={onMaterialTypeFilterChange}
        />
      </CoursePanelShell>
    );
  }

  if (studyMode === "tasks" && !selectedTaskId && studyOutline.tasks.length > 0) {
    return (
      <CoursePanelShell course={course}>
        <TaskOutline
          selectedTaskId={selectedTaskId}
          tasks={studyOutline.tasks}
          onSelectTask={onSelectTask}
          onTaskStatusChange={onTaskStatusChange}
        />
      </CoursePanelShell>
    );
  }

  if (studyMode === "tasks" || studyMode === "script") {
    return (
      <section className="flex min-h-[60dvh] flex-col overflow-visible md:h-full md:min-h-0 md:overflow-hidden">
        <TaskStudyPanel
          course={course}
          materials={materials}
          mode={studyMode}
          onOpenResource={onOpenResource}
          onSelectedScriptSectionIdChange={onSelectedScriptSectionIdChange}
          onSelectedTaskIdChange={onSelectedTaskIdChange}
          onStudyOutlineChange={onStudyOutlineChange}
          onTaskViewChange={handleTaskViewChange}
          onTestActivityChange={onTestActivityChange}
          taskViewOverride={taskViewOverride}
          selectedScriptSectionId={selectedScriptSectionId}
          selectedTaskId={selectedTaskId}
        />
      </section>
    );
  }

  return (
    <CoursePanelShell>
      <NoCourseSelected />
    </CoursePanelShell>
  );
}

function courseFallbackFromRoute(courseId: string): Course {
  return {
    id: courseId,
    fullName: `Course ${courseId}`,
    shortName: courseId,
  };
}

function CoursePanelShell({ children, course }: { children: ReactNode; course?: Course | null }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      <div className="min-h-0 flex-1 overflow-auto">
        {course ? <CourseHero course={course} /> : null}
        <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-5">
          {children}
        </div>
      </div>
    </section>
  );
}

function NoCourseSelected() {
  return (
    <div className="grid min-h-[40dvh] place-items-center py-8 text-center">
      <div className="max-w-sm">
        <FileText className="mx-auto mb-3 text-muted-foreground" aria-hidden />
        <p className="font-medium">No course selected</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose a course to open its study workspace.</p>
      </div>
    </div>
  );
}
