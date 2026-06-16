import { describe, expect, test } from "bun:test";

import {
  courseResourcesLayoutFromSettings,
  courseResourcesTypeFilterFromSettings,
} from "@/lib/material-display-preferences";

describe("material-display-preferences", () => {
  test("restores valid course resource display preferences", () => {
    expect(courseResourcesLayoutFromSettings("grid")).toBe("grid");
    expect(courseResourcesLayoutFromSettings("list")).toBe("list");
    expect(courseResourcesTypeFilterFromSettings("pdf")).toBe("pdf");
    expect(courseResourcesTypeFilterFromSettings("pages")).toBe("pages");
    expect(courseResourcesTypeFilterFromSettings("all")).toBe("all");
  });

  test("falls back when stored values are missing or invalid", () => {
    expect(courseResourcesLayoutFromSettings("compact")).toBe("list");
    expect(courseResourcesLayoutFromSettings(null)).toBe("list");
    expect(courseResourcesTypeFilterFromSettings("videos")).toBe("all");
    expect(courseResourcesTypeFilterFromSettings(undefined)).toBe("all");
  });
});
