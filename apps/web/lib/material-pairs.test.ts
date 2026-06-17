import { describe, expect, test } from "bun:test";

import type { Material } from "@/lib/dashboard-data";
import { findTaskSheetSolutionPair } from "@/lib/material-pairs";

describe("material pairs", () => {
  test("pairs an Aufgabenblatt with its solution", () => {
    const sheet = material("sheet-11", "Aufgabenblatt 11", "Speichergekoppelte Systeme");
    const solution = material("solution-11", "Aufgabenblatt 11 -- Lösung", "Speichergekoppelte Systeme");

    const sheetPair = findTaskSheetSolutionPair(sheet, [sheet, solution]);
    expect(sheetPair?.counterpart).toBe(solution);
    expect(sheetPair?.number).toBe("11");
    expect(sheetPair?.role).toBe("sheet");
    expect(sheetPair?.sheet).toBe(sheet);
    expect(sheetPair?.solution).toBe(solution);

    const solutionPair = findTaskSheetSolutionPair(solution, [sheet, solution]);
    expect(solutionPair?.counterpart).toBe(sheet);
    expect(solutionPair?.role).toBe("solution");
  });

  test("prefers the solution in the same section", () => {
    const sheet = material("sheet-10", "Aufgabenblatt 10", "A");
    const wrongSectionSolution = material("old-solution-10", "Aufgabenblatt 10 Lösung", "B");
    const sameSectionSolution = material("solution-10", "Aufgabenblatt 10 -- Lösung", "A");

    expect(findTaskSheetSolutionPair(sheet, [sheet, wrongSectionSolution, sameSectionSolution])?.counterpart).toBe(
      sameSectionSolution,
    );
  });

  test("ignores lecture material and unpaired sheets", () => {
    const lecture = material("teil-05", "Teil 05");
    const sheet = material("sheet-12", "Aufgabenblatt 12");

    expect(findTaskSheetSolutionPair(lecture, [lecture, sheet])).toBeNull();
    expect(findTaskSheetSolutionPair(sheet, [lecture, sheet])).toBeNull();
  });
});

function material(id: string, name: string, sectionName = "Materialien"): Material {
  return {
    fileType: "pdf",
    id,
    name,
    sectionName,
  };
}
