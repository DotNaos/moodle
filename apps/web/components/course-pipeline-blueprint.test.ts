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
  test("builds a blackbox conveyor graph from trace data", () => {
    const graph = buildBlueprintGraph({ inventory, runs, status });
    const titles = graph.nodes.map((node) => node.data.title);

    expect(titles).toContain("Course");
    expect(titles).toContain("Resource Set");
    expect(titles).toContain("Aufgabenblatt 01");
    expect(titles).toContain("Aufgabenblatt 02");
    expect(titles).toContain("Collect Pair");
    expect(titles).toContain("Codex Transform");
    expect(titles).toContain("Output 1");
    expect(titles).toContain("Output 2");
    expect(titles).toContain("Script Section 1");
    expect(titles).toContain("Review Collector");

    expect(graph.nodes.find((node) => node.id === "resource-set")?.data.stepKind).toBe("split");
    expect(graph.nodes.find((node) => node.data.title === "Collect Pair")?.data.stepKind).toBe("collect");
    expect(graph.nodes.find((node) => node.data.title === "Codex Transform")?.data.stepKind).toBe("transform");
    expect(graph.nodes.find((node) => node.data.title === "Output 2")?.data.problems?.map((problem) => problem.label)).toContain("Solution missing");
    const nodeTitles = new Map(graph.nodes.map((node) => [node.id, node.data.title]));
    const directTaskGroupToOutput = graph.edges.some((edge) => {
      const sourceTitle = nodeTitles.get(edge.source) ?? "";
      const targetTitle = nodeTitles.get(edge.target) ?? "";
      return sourceTitle.startsWith("Aufgabenblatt") && targetTitle.startsWith("Output");
    });
    expect(directTaskGroupToOutput).toBe(false);
    expect(graph.nodes.some((node) => node.data.tone === "warning")).toBe(true);
  });

  test("handles empty pipeline data without crashing", () => {
    const graph = buildBlueprintGraph({ inventory: null, runs: null, status: null });

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.nodes.find((node) => node.id === "course")?.data.subtitle).toBe("0 resources");
    expect(graph.nodes.find((node) => node.id === "resource-set")?.data.status).toBe("missing");
    expect(graph.nodes.find((node) => node.id === "resource-set")?.data.problems?.[0]?.label).toBe("Inventory missing");
  });

  test("sorts repeated task groups naturally and collapses the middle", () => {
    const manyTaskGroups: CourseInventoryResponse = {
      ...inventory,
      summary: { ...inventory.summary, taskGroups: 12, pairedTaskGroups: 12, missingSolutionGroups: 0, totalResources: 24 },
      taskGroups: Array.from({ length: 12 }, (_, index) => {
        const number = index + 1;
        return {
          id: `sheet-${number}`,
          pairingConfidence: "high",
          pairingReason: "Sheet and solution numbers match.",
          pairingStatus: "paired" as const,
          sheet: {
            bucket: "task_sheet" as const,
            confidence: "high" as const,
            id: `sheet-${number}`,
            name: `Aufgabenblatt ${number}`,
            reason: "Task sheet",
            role: "sheet" as const,
            sectionName: "Einführung",
            type: "pdf",
          },
          solution: {
            bucket: "solution" as const,
            confidence: "high" as const,
            id: `solution-${number}`,
            name: `Aufgabenblatt ${number} Lösung`,
            reason: "Solution sheet",
            role: "solution" as const,
            sectionName: "Einführung",
            type: "pdf",
          },
          title: `Aufgabenblatt ${number}`,
        };
      }).reverse(),
    };

    const graph = buildBlueprintGraph({ inventory: manyTaskGroups, runs: null, status });
    const titles = graph.nodes.map((node) => node.data.title);

    expect(titles).toContain("Aufgabenblatt 1");
    expect(titles).toContain("Aufgabenblatt 12");
    expect(titles).not.toContain("Aufgabenblatt 10");
    expect(titles).toContain("2 ... 11 collapsed");
    expect(titles.indexOf("Aufgabenblatt 1")).toBeLessThan(titles.indexOf("Aufgabenblatt 12"));
  });
});
