import { describe, expect, test } from "bun:test";

import type { Material } from "@/lib/dashboard-data";
import {
  countMaterialsForFilter,
  filterMaterialsBySection,
  isPdfMaterial,
  matchesMaterialTypeFilter,
} from "@/lib/material-filters";

const pdfMaterial: Material = {
  id: "pdf-1",
  name: "Folien Teil 1.pdf",
  type: "resource",
  fileType: "PDF",
  sectionName: "Thema 1",
};

const pageMaterial: Material = {
  id: "page-1",
  name: "Modulbeschreibungen",
  type: "resource",
  sectionName: "Allgemeine Informationen",
};

const sections: [string, Material[]][] = [
  ["Allgemeine Informationen", [pageMaterial, pdfMaterial]],
  ["Thema 1", [pdfMaterial]],
];

describe("material-filters", () => {
  test("detects pdf materials from fileType, name, or url", () => {
    expect(isPdfMaterial(pdfMaterial)).toBe(true);
    expect(isPdfMaterial(pageMaterial)).toBe(false);
    expect(isPdfMaterial({ id: "x", name: "notes", url: "/files/sheet.PDF" })).toBe(true);
  });

  test("filters pdf materials only", () => {
    expect(matchesMaterialTypeFilter(pdfMaterial, "pdf")).toBe(true);
    expect(matchesMaterialTypeFilter(pageMaterial, "pdf")).toBe(false);
    expect(matchesMaterialTypeFilter(pageMaterial, "pages")).toBe(true);
  });

  test("filters sections and drops empty groups", () => {
    expect(filterMaterialsBySection(sections, "pdf")).toEqual([["Allgemeine Informationen", [pdfMaterial]], ["Thema 1", [pdfMaterial]]]);
    expect(filterMaterialsBySection(sections, "pages")).toEqual([["Allgemeine Informationen", [pageMaterial]]]);
    expect(filterMaterialsBySection(sections, "all")).toEqual(sections);
  });

  test("counts materials per filter", () => {
    expect(countMaterialsForFilter([pdfMaterial, pageMaterial, pdfMaterial], "pdf")).toBe(2);
    expect(countMaterialsForFilter([pdfMaterial, pageMaterial, pdfMaterial], "pages")).toBe(1);
  });
});
