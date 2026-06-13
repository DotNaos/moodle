import { describe, expect, test } from "bun:test";

import { buildBlueprintGraph, type PipelineRunsResponse } from "@/components/course-pipeline-blueprint";
import type { CourseInventoryResponse, StudyPipelineStatusResponse } from "@/components/study-pipeline-preview";

const inventory: CourseInventoryResponse = {
  artifactRoot: "study-pipeline/course-22584",
  courseId: "22584",
  generatedAt: "2026-06-13T07:00:00Z",
  interactions: [],
  lectureMaterial: [
    {
      bucket: "lecture_material",
      confidence: "high",
      id: "947700",
      name: "Teil 01 Skript",
      reason: "Script material",
      role: "script",
      sectionName: "Einführung",
      type: "pdf",
    },
  ],
  references: [],
  summary: {
    ambiguousTaskGroups: 0,
    ignoredAllowed: 0,
    interactions: 0,
    lectureMaterial: 1,
    missingSolutionGroups: 1,
    pairedTaskGroups: 1,
    references: 0,
    taskGroups: 2,
    totalResources: 3,
    unknown: 1,
  },
  taskGroups: [
    {
      id: "sheet-01",
      pairingConfidence: "high",
      pairingReason: "Sheet and solution numbers match.",
      pairingStatus: "paired",
      sheet: {
        bucket: "task_sheet",
        confidence: "high",
        id: "947711",
        name: "Aufgabenblatt 01",
        reason: "Task sheet",
        role: "sheet",
        sectionName: "Einführung",
        type: "pdf",
      },
      solution: {
        bucket: "solution",
        confidence: "high",
        id: "947712",
        name: "Aufgabenblatt 01 Lösung",
        reason: "Solution sheet",
        role: "solution",
        sectionName: "Einführung",
        type: "pdf",
      },
      title: "Aufgabenblatt 01",
    },
    {
      id: "sheet-02",
      pairingConfidence: "low",
      pairingReason: "No matching solution found.",
      pairingStatus: "missing_solution",
      sheet: {
        bucket: "task_sheet",
        confidence: "high",
        id: "947713",
        name: "Aufgabenblatt 02",
        reason: "Task sheet",
        role: "sheet",
        sectionName: "Einführung",
        type: "pdf",
      },
      title: "Aufgabenblatt 02",
    },
  ],
  unknown: [
    {
      bucket: "unknown",
      confidence: "low",
      id: "resource-unknown",
      name: "Unklarer Anhang",
      reason: "No confident bucket matched.",
      role: "unknown",
      sectionName: "Anhang",
      type: "pdf",
    },
  ],
};

const status: StudyPipelineStatusResponse = {
  courseId: "22584",
  createdAt: "2026-06-13T07:01:00Z",
  materials: [],
  missingSolutions: [],
  stage: "extracted",
  status: "running",
  summary: {
    linkedSolutions: 1,
    missingSolutions: 1,
    other: 0,
    scripts: 1,
    slides: 0,
    solutions: 1,
    tasks: 2,
    totalResources: 3,
  },
  taskLinks: [],
};

const runs: PipelineRunsResponse = {
  activeSelections: [
    {
      activeRunId: "run-extracted-ok",
      reason: "selected in course pipeline inspector",
      selectedAt: "2026-06-13T07:05:00Z",
      sourceId: "source:moodle-course:22584",
      stage: "extracted",
    },
  ],
  courseId: "22584",
  runs: [
    {
      artifactRoot: "study-pipeline/course-22584/run-raw",
      configHash: "config:raw:default",
      courseId: "22584",
      createdAt: "2026-06-13T07:02:00Z",
      engine: "moodle_api",
      id: "run-raw-ok",
      ownership: "shared",
      sourceId: "source:moodle-course:22584",
      stage: "raw",
      status: "succeeded",
    },
    {
      artifactRoot: "study-pipeline/course-22584/run-extracted",
      configHash: "config:extracted:default",
      courseId: "22584",
      createdAt: "2026-06-13T07:03:00Z",
      engine: "docling",
      id: "run-extracted-ok",
      ownership: "shared",
      sourceId: "source:moodle-course:22584",
      stage: "extracted",
      status: "succeeded",
    },
    {
      artifactRoot: "study-pipeline/course-22584/run-curated",
      configHash: "config:curated:default",
      courseId: "22584",
      createdAt: "2026-06-13T07:04:00Z",
      engine: "codex",
      error: "curation failed",
      id: "run-curated-failed",
      ownership: "user_owned",
      sourceId: "source:moodle-course:22584",
      stage: "curated",
      status: "failed",
    },
  ],
};

describe("course pipeline blueprint graph", () => {
  test("builds source, bucket, run, output, and warning nodes from trace data", () => {
    const graph = buildBlueprintGraph({ inventory, runs, status });
    const titles = graph.nodes.map((node) => node.data.title);

    expect(titles).toContain("Moodle course");
    expect(titles).toContain("Inventory");
    expect(titles).toContain("Aufgabenblatt 01");
    expect(titles).toContain("Aufgabenblatt 02");
    expect(titles).toContain("Extracted");
    expect(titles).toContain("Final outputs");
    expect(titles).toContain("Codex curated failed");
    expect(graph.edges.some((edge) => edge.source === "run-extracted" && edge.target === "run-curated")).toBe(true);
    expect(graph.nodes.find((node) => node.id === "run-extracted")?.data.active).toBe(true);
    expect(graph.nodes.some((node) => node.data.tone === "warning")).toBe(true);
  });

  test("handles empty pipeline data without crashing", () => {
    const graph = buildBlueprintGraph({ inventory: null, runs: null, status: null });

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.nodes.find((node) => node.id === "course")?.data.subtitle).toBe("0 resources");
    expect(graph.nodes.find((node) => node.id === "run-extracted")?.data.status).toBe("missing");
  });
});
