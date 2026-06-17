import type { TaskViewResponse } from "@/components/task-study-panel";
import type { Material } from "@/lib/dashboard-data";
import type { StudyOutline } from "@/lib/study-outline";

export function buildTaskLinksByResourceId(
  tasks: StudyOutline["tasks"],
  taskView: TaskViewResponse | null,
): Map<string, string> {
  const links = new Map<string, string>();
  for (const task of tasks) {
    const sheet = taskView?.sheets.find((candidate) =>
      candidate.tasks.some((viewTask) => viewTask.taskId === task.id),
    );
    const resourceId = sheet?.resourceId ?? taskView?.sheets.find((candidate) => candidate.title === task.sheetTitle)?.resourceId;
    if (resourceId && !links.has(resourceId)) {
      links.set(resourceId, task.id);
    }
    if (sheet?.solutionResourceId && !links.has(sheet.solutionResourceId)) {
      links.set(sheet.solutionResourceId, task.id);
    }
  }
  return links;
}

export function taskIdForMaterial(material: Material, knownLinks: Map<string, string>): string | null {
  const known = knownLinks.get(material.id);
  if (known) {
    return known;
  }
  if (!isTaskSheetMaterial(material)) {
    return null;
  }
  return `task-${material.id}-${slugifyStudyId(material.name.replace(/\.[a-z0-9]{2,4}$/i, ""))}`;
}

function isTaskSheetMaterial(material: Material): boolean {
  const name = material.name.toLowerCase();
  const isPdf = material.fileType?.toLowerCase() === "pdf" || /\.pdf$/i.test(material.name) || !material.fileType;
  return isPdf && /aufgabenblatt\s*\d+/i.test(material.name) && !/lösung|loesung|solution/i.test(name);
}

function slugifyStudyId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
