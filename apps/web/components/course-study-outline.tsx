"use client";

import { useMemo, useState } from "react";

import { EmptyState, LoadingRows, MaterialGridCard, MaterialRow } from "@/components/dashboard-ui";
import { GroupedItemsView, GroupedSectionHeader, type GroupedItemsLayout } from "@/components/grouped-items-view";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Material } from "@/lib/dashboard-data";
import {
  countMaterialsForFilter,
  filterMaterialsBySection,
  type MaterialTypeFilter,
} from "@/lib/material-filters";
import type { ScriptSectionOutline, StudyOutline } from "@/lib/study-outline";
import { cn } from "@/lib/utils";

export function MaterialsOutline({
  materials,
  materialsBySection,
  materialsLoading,
  selectedMaterialId,
  onSelectMaterial,
}: {
  materials: Material[];
  materialsBySection: [string, Material[]][];
  materialsLoading: boolean;
  selectedMaterialId: string | null;
  onSelectMaterial: (material: Material) => void;
}) {
  const [layout, setLayout] = useState<GroupedItemsLayout>("list");
  const [typeFilter, setTypeFilter] = useState<MaterialTypeFilter>("all");

  const filteredSections = useMemo(
    () => filterMaterialsBySection(materialsBySection, typeFilter),
    [materialsBySection, typeFilter],
  );
  const filteredCount = useMemo(
    () => filteredSections.reduce((total, [, sectionMaterials]) => total + sectionMaterials.length, 0),
    [filteredSections],
  );
  const pdfCount = useMemo(() => countMaterialsForFilter(materials, "pdf"), [materials]);
  const pagesCount = useMemo(() => countMaterialsForFilter(materials, "pages"), [materials]);

  if (materialsLoading) {
    return <LoadingRows label="Loading materials" />;
  }
  if (materials.length === 0) {
    return <EmptyState title="No materials loaded" description="Go back and choose another course, or refresh Moodle." />;
  }

  return (
    <GroupedItemsView
      header={
        <MaterialTypeFilterSelect
          filter={typeFilter}
          materialsCount={materials.length}
          pagesCount={pagesCount}
          pdfCount={pdfCount}
          onFilterChange={setTypeFilter}
        />
      }
      layout={layout}
      sections={filteredSections.map(([section, sectionMaterials]) => ({
        key: section,
        label: section,
        items: sectionMaterials,
      }))}
      getItemKey={(material) => material.id}
      onLayoutChange={setLayout}
      renderGridItem={(material) => (
        <MaterialGridCard
          active={material.id === selectedMaterialId}
          material={material}
          onSelect={() => onSelectMaterial(material)}
        />
      )}
      renderListItem={(material) => (
        <MaterialRow
          active={material.id === selectedMaterialId}
          material={material}
          onSelect={() => onSelectMaterial(material)}
        />
      )}
      emptyState={
        filteredCount === 0 ? (
          <EmptyState
            title={typeFilter === "pdf" ? "Keine PDFs gefunden" : "Keine Seiten & Ressourcen gefunden"}
            description="Probiere einen anderen Typ-Filter oder wähle „Alle Typen“."
          />
        ) : null
      }
    />
  );
}

function MaterialTypeFilterSelect({
  filter,
  materialsCount,
  pagesCount,
  pdfCount,
  onFilterChange,
}: {
  filter: MaterialTypeFilter;
  materialsCount: number;
  pagesCount: number;
  pdfCount: number;
  onFilterChange: (filter: MaterialTypeFilter) => void;
}) {
  return (
    <Select value={filter} onValueChange={(value) => onFilterChange(value as MaterialTypeFilter)}>
      <SelectTrigger
        aria-label="Materialtyp filtern"
        className="h-11 w-full rounded-full border-0 bg-secondary px-4 text-sm shadow-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:min-w-[12rem]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="rounded-3xl border-0 bg-card p-2 text-card-foreground shadow-xl"
        position="popper"
        sideOffset={6}
      >
        <SelectItem className="rounded-2xl px-3 py-2.5" value="all">
          Alle Typen ({materialsCount})
        </SelectItem>
        <SelectItem className="rounded-2xl px-3 py-2.5" value="pdf">
          PDFs ({pdfCount})
        </SelectItem>
        <SelectItem className="rounded-2xl px-3 py-2.5" value="pages">
          Seiten & Ressourcen ({pagesCount})
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function TaskOutline({
  selectedTaskId,
  tasks,
  onSelectTask,
}: {
  selectedTaskId: string | null;
  tasks: StudyOutline["tasks"];
  onSelectTask: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return <LoadingRows label="Loading tasks" />;
  }
  const groups = groupStudyTasksBySheet(tasks);
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, index) => (
        <section className={cn("flex flex-col gap-0.5", index > 0 && "border-t border-border")} key={group.sheetTitle}>
          <GroupedSectionHeader label={group.sheetTitle} />
          {group.tasks.map((task) => (
            <button
              className={cn(
                "min-h-11 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedTaskId === task.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              type="button"
            >
              <span className="line-clamp-2 font-medium">{task.title}</span>
              <span
                className={cn(
                  "mt-1 block truncate text-xs",
                  selectedTaskId === task.id ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {task.status.replace("_", " ")}
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

export function ScriptOutline({
  scriptSections,
  selectedScriptSectionId,
  onSelectScriptSection,
}: {
  scriptSections: StudyOutline["scriptSections"];
  selectedScriptSectionId: string | null;
  onSelectScriptSection: (sectionId: string) => void;
}) {
  if (scriptSections.length === 0) {
    return <LoadingRows label="Loading sections" />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {scriptSections.map((section) => (
        <button
          className={cn(
            "min-h-11 rounded-lg py-2 pr-3 text-left text-sm transition-colors",
            section.level > 1 ? "pl-6" : "pl-3",
            selectedScriptSectionId === section.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
          key={`${section.id}-${section.blockIndex}`}
          onClick={() => onSelectScriptSection(section.id)}
          type="button"
        >
          <span className="line-clamp-2 font-medium">{section.title}</span>
        </button>
      ))}
    </div>
  );
}

export function groupStudyTasksBySheet(tasks: StudyOutline["tasks"]) {
  const groups: Array<{ sheetTitle: string; tasks: StudyOutline["tasks"] }> = [];
  for (const task of tasks) {
    const lastGroup = groups.at(-1);
    if (lastGroup?.sheetTitle === task.sheetTitle) {
      lastGroup.tasks.push(task);
    } else {
      groups.push({ sheetTitle: task.sheetTitle, tasks: [task] });
    }
  }
  return groups;
}

export function groupScriptSections(scriptSections: ScriptSectionOutline[]) {
  const groups: Array<{ children: ScriptSectionOutline[]; parent: ScriptSectionOutline }> = [];
  for (const section of scriptSections) {
    if (!isNumberedScriptSection(section.title)) {
      continue;
    }
    if (isTopLevelScriptSection(section.title) || groups.length === 0) {
      groups.push({ children: [], parent: section });
      continue;
    }
    groups[groups.length - 1].children.push(section);
  }
  return groups;
}

function isNumberedScriptSection(title: string): boolean {
  return /^\d+(?:\.\d+)*\.?\s+/.test(title);
}

function isTopLevelScriptSection(title: string): boolean {
  return /^\d+\.\s+/.test(title);
}
