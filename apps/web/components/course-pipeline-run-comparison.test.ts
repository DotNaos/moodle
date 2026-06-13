import { describe, expect, test } from "bun:test";

import type { PipelineRunsResponse } from "@/components/course-pipeline-blueprint";
import { buildRunComparisonModels } from "@/components/course-pipeline-run-comparison";

const runs: PipelineRunsResponse = {
  activeSelections: [
    {
      activeRunId: "run-docling",
      reason: "compare OCR engines",
      selectedAt: "2026-06-13T08:00:00Z",
      sourceId: "source:moodle-course:22584",
      stage: "extracted",
    },
  ],
  courseId: "22584",
  runs: [
    {
      artifactRefs: [{ id: "text", kind: "ocr_text", metadata: { chars: 540, preview: "Docling extracted a useful paragraph." } }],
      artifactRoot: "/srv/docling",
      configHash: "config:extracted:docling:default",
      courseId: "22584",
      createdAt: "2026-06-13T08:00:00Z",
      engine: "docling",
      id: "run-docling",
      ownership: "shared",
      sourceId: "source:moodle-course:22584",
      stage: "extracted",
      status: "succeeded",
    },
    {
      artifactRefs: [{ id: "text", kind: "ocr_text", metadata: { chars: 0, preview: "" } }],
      artifactRoot: "/srv/pdftotext",
      configHash: "config:extracted:pdftotext:default",
      courseId: "22584",
      createdAt: "2026-06-13T07:00:00Z",
      engine: "baseline-pdftotext-pdftoppm",
      id: "run-pdftotext",
      ownership: "shared",
      sourceId: "source:moodle-course:22584",
      stage: "extracted",
      status: "succeeded",
    },
  ],
};

describe("pipeline run comparison", () => {
  test("groups extracted runs by engine and marks active, weak, and missing engines", () => {
    const models = buildRunComparisonModels(runs);

    expect(models.map((model) => model.engine)).toEqual(["pdftotext", "docling", "marker"]);
    expect(models.find((model) => model.engine === "docling")?.status).toBe("active");
    expect(models.find((model) => model.engine === "docling")?.preview).toContain("useful paragraph");
    expect(models.find((model) => model.engine === "pdftotext")?.status).toBe("weak");
    expect(models.find((model) => model.engine === "marker")?.status).toBe("missing");
  });
});
