export type StudyTaskOutline = {
  id: string;
  sectionTitle?: string;
  sheetTitle: string;
  status: TaskProgressStatus;
  title: string;
};

export type TaskProgressStatus = "open" | "started" | "done" | "checked" | "correct" | "wrong" | "needs_review" | string;

export type ScriptSectionOutline = {
  blockIndex: number;
  id: string;
  level: number;
  title: string;
};

export type StudyOutline = {
  scriptSections: ScriptSectionOutline[];
  tasks: StudyTaskOutline[];
};

export const EMPTY_STUDY_OUTLINE: StudyOutline = {
  scriptSections: [],
  tasks: [],
};

// Combines sheet and task numbering into one label: "Aufgabenblatt 01" +
// "Aufgabe 1" → "Aufgabe 1.1". Titles outside that pattern stay unchanged.
export function taskDisplayTitle(sheetTitle: string | null | undefined, taskTitle: string): string {
  const sheetNumber = firstNumberIn(sheetTitle ?? "");
  const taskMatch = taskTitle.match(/^aufgabe\s*0*(\d+)(.*)$/i);
  if (sheetNumber === null || !taskMatch) {
    return taskTitle;
  }
  return `Aufgabe ${sheetNumber}.${Number(taskMatch[1])}${taskMatch[2]}`;
}

function firstNumberIn(value: string): number | null {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}
