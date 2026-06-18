"use client";

import { FileIcon } from "@dotnaos/react-ui/web";
import { CheckSquare, Download, FileArchive, Filter, Globe, Layers, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState, LoadingRows, MaterialGridCard, MaterialGridPair, MaterialListPair, MaterialRow } from "@/components/dashboard-ui";
import { GroupedItemsView, type GroupedItemsLayout } from "@/components/grouped-items-view";
import { MaterialsSectionOutline, sectionAnchorId } from "@/components/materials-section-outline";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Material } from "@/lib/dashboard-data";
import {
  buildMergedPDFBlob,
  buildPDFBundleFilename,
  buildPDFZipBlob,
} from "@/lib/material-export-actions";
import {
  filterMaterialsBySection,
  isPdfMaterial,
  type MaterialTypeFilter,
} from "@/lib/material-filters";
import { buildNavigatorURL, homeState, openDocument } from "@/lib/navigator";
import { startBlobDownload } from "@/lib/pdf-file-actions";
import { cn } from "@/lib/utils";

export function MaterialsOutline({
  courseId,
  courseName,
  layout,
  materials,
  materialsBySection,
  materialsLoading,
  selectedMaterialId,
  taskIdForMaterial,
  typeFilter,
  onLayoutChange,
  onOpenTask,
  onSelectMaterial,
  onTypeFilterChange,
}: {
  courseId: string | null;
  courseName?: string;
  layout: GroupedItemsLayout;
  materials: Material[];
  materialsBySection: [string, Material[]][];
  materialsLoading: boolean;
  selectedMaterialId: string | null;
  taskIdForMaterial?: (material: Material) => string | null;
  typeFilter: MaterialTypeFilter;
  onLayoutChange: (layout: GroupedItemsLayout) => void;
  onOpenTask?: (taskId: string) => void;
  onSelectMaterial: (material: Material) => void;
  onTypeFilterChange: (filter: MaterialTypeFilter) => void;
}) {
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [actionState, setActionState] = useState<MaterialExportActionState>({ kind: "idle" });
  const filteredSections = useMemo(
    () => filterMaterialsBySection(materialsBySection, typeFilter),
    [materialsBySection, typeFilter],
  );
  const displaySections = useMemo(
    () => filteredSections.map(([section, sectionMaterials]) => [section, buildMaterialDisplayItems(sectionMaterials)] as const),
    [filteredSections],
  );
  const materialHref = useCallback((material: Material) => courseId ? buildMaterialHref(courseId, material) : "#", [courseId]);
  const filteredCount = useMemo(
    () => filteredSections.reduce((total, [, sectionMaterials]) => total + sectionMaterials.length, 0),
    [filteredSections],
  );
  const outlineSections = useMemo(
    () => displaySections.map(([section, sectionItems]) => ({
      anchorId: sectionAnchorId(section),
      count: sectionItems.reduce((total, item) => total + item.materials.length, 0),
      children: sectionItems.flatMap((item) => item.materials.map((material) => ({
        href: materialHref(material),
        key: material.id,
        label: material.name,
      }))),
      key: section,
      label: section,
    })),
    [displaySections, materialHref],
  );
  const pdfMaterials = useMemo(() => materials.filter(isPdfMaterial), [materials]);
  const selectedMaterials = useMemo(
    () => pdfMaterials.filter((material) => selectedMaterialIds.has(material.id)),
    [pdfMaterials, selectedMaterialIds],
  );
  const visiblePDFMaterials = useMemo(
    () => filteredSections.flatMap(([, sectionMaterials]) => sectionMaterials.filter(isPdfMaterial)),
    [filteredSections],
  );
  const visiblePDFIds = useMemo(() => new Set(visiblePDFMaterials.map((material) => material.id)), [visiblePDFMaterials]);
  const allVisiblePDFsSelected = visiblePDFMaterials.length > 0 && visiblePDFMaterials.every((material) => selectedMaterialIds.has(material.id));

  useEffect(() => {
    const availableIds = new Set(pdfMaterials.map((material) => material.id));
    setSelectedMaterialIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [pdfMaterials]);

  const taskOpenerForMaterial = (material: Material) => {
    const taskId = taskIdForMaterial?.(material) ?? taskIdForPairedSheetMaterial(material, materials, taskIdForMaterial);
    return taskId && onOpenTask ? () => onOpenTask(taskId) : undefined;
  };
  const toggleSelection = (material: Material) => {
    setActionState({ kind: "idle" });
    setSelectedMaterialIds((current) => {
      const next = new Set(current);
      if (next.has(material.id)) {
        next.delete(material.id);
      } else {
        next.add(material.id);
      }
      return next;
    });
  };

  const toggleSelectMode = () => {
    setActionState({ kind: "idle" });
    setSelectMode((current) => !current);
  };

  const toggleVisiblePDFSelection = () => {
    setActionState({ kind: "idle" });
    setSelectedMaterialIds((current) => {
      const next = new Set(current);
      if (allVisiblePDFsSelected) {
        for (const id of visiblePDFIds) {
          next.delete(id);
        }
      } else {
        for (const id of visiblePDFIds) {
          next.add(id);
        }
      }
      return next;
    });
  };

  const toggleSectionPDFSelection = (sectionMaterials: Material[]) => {
    const sectionPDFMaterials = sectionMaterials.filter(isPdfMaterial);
    if (sectionPDFMaterials.length === 0) {
      return;
    }

    setActionState({ kind: "idle" });
    setSelectedMaterialIds((current) => {
      const allSectionPDFsSelected = sectionPDFMaterials.every((material) => current.has(material.id));
      const next = new Set(current);
      for (const material of sectionPDFMaterials) {
        if (allSectionPDFsSelected) {
          next.delete(material.id);
        } else {
          next.add(material.id);
        }
      }
      return next;
    });
  };

  const runExportAction = useCallback(
    async (action: MaterialExportAction) => {
      if (!courseId || selectedMaterials.length === 0) {
        return;
      }

      setActionState({ action, kind: "running" });
      try {
        if (action === "print") {
          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            throw new Error("The browser blocked the print window.");
          }
          printWindow.document.write("<!doctype html><title>PDFs werden vorbereitet</title><body>PDFs werden vorbereitet...</body>");
          const blob = await buildMergedPDFBlob(courseId, selectedMaterials);
          const url = URL.createObjectURL(blob);
          printWindow.addEventListener("load", () => {
            printWindow.focus();
            printWindow.print();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          }, { once: true });
          printWindow.location.href = url;
        } else if (action === "pdf") {
          const blob = await buildMergedPDFBlob(courseId, selectedMaterials);
          startBlobDownload(blob, buildPDFBundleFilename(courseName, "pdf"));
        } else {
          const blob = await buildPDFZipBlob(courseId, selectedMaterials);
          startBlobDownload(blob, buildPDFBundleFilename(courseName, "zip"));
        }
        setActionState({ action, kind: "done" });
      } catch (error) {
        setActionState({
          action,
          kind: "failed",
          message: error instanceof Error ? error.message : "Export failed.",
        });
      }
    },
    [courseId, courseName, selectedMaterials],
  );

  if (materialsLoading) {
    return <LoadingRows label="Loading materials" />;
  }
  if (materials.length === 0) {
    return <EmptyState title="No materials loaded" description="Go back and choose another course, or refresh Moodle." />;
  }

  return (
    <div className="flex items-start gap-8">
      <MaterialsSectionOutline sections={outlineSections} scrollSelector="[data-course-scroll]" />
      <div className="min-w-0 flex-1">
        <GroupedItemsView
          header={
            <MaterialTypeFilterSelect
              filter={typeFilter}
              onFilterChange={onTypeFilterChange}
            />
          }
          layout={layout}
          toolbarControls={
            <MaterialSelectionControls
              actionState={actionState}
              allVisiblePDFsSelected={allVisiblePDFsSelected}
              disabled={!courseId}
              selectMode={selectMode}
              selectedCount={selectedMaterials.length}
              visiblePDFCount={visiblePDFMaterials.length}
              onExportPDF={() => void runExportAction("pdf")}
              onPrint={() => void runExportAction("print")}
              onToggleSelectMode={toggleSelectMode}
              onToggleVisiblePDFSelection={toggleVisiblePDFSelection}
              onZip={() => void runExportAction("zip")}
            />
          }
          sections={displaySections.map(([section, sectionItems]) => {
            const sectionMaterials = sectionItems.flatMap((item) => item.materials);
            return {
              action: selectMode ? (
                <MaterialSectionSelectionCheckbox
                  materials={sectionMaterials}
                  sectionLabel={section}
                  selectedMaterialIds={selectedMaterialIds}
                  onToggle={() => toggleSectionPDFSelection(sectionMaterials)}
                />
              ) : undefined,
              anchorId: sectionAnchorId(section),
              key: section,
              label: section,
              items: sectionItems,
            };
          })}
          getItemKey={(item) => item.key}
          onLayoutChange={onLayoutChange}
          renderGridItem={(item) => {
            if (item.materials.length === 2) {
              return (
                <MaterialGridPair
                  activeMaterialId={selectedMaterialId}
                  hrefForMaterial={materialHref}
                  materials={item.materials}
                  onOpenTask={taskOpenerForMaterial(item.materials[0])}
                  onSelect={(material) => selectMode && isPdfMaterial(material) ? toggleSelection(material) : onSelectMaterial(material)}
                  onToggleSelection={selectMode ? toggleSelection : undefined}
                  selectedMaterialIds={selectedMaterialIds}
                />
              );
            }

            const material = item.materials[0];
            return (
              <MaterialGridCard
                active={material.id === selectedMaterialId}
                href={materialHref(material)}
                material={material}
                openTaskLabel={materialTaskActionLabel(material.name)}
                onOpenTask={taskOpenerForMaterial(material)}
                onSelect={selectMode && isPdfMaterial(material) ? () => toggleSelection(material) : () => onSelectMaterial(material)}
                onToggleSelection={selectMode && isPdfMaterial(material) ? () => toggleSelection(material) : undefined}
                selectedForExport={selectedMaterialIds.has(material.id)}
              />
            );
          }}
          renderListItem={(item) => {
            if (item.materials.length === 2) {
              return (
                <MaterialListPair
                  activeMaterialId={selectedMaterialId}
                  hrefForMaterial={materialHref}
                  materials={item.materials}
                  onOpenTask={taskOpenerForMaterial(item.materials[0])}
                  onSelect={(material) => selectMode && isPdfMaterial(material) ? toggleSelection(material) : onSelectMaterial(material)}
                  onToggleSelection={selectMode ? toggleSelection : undefined}
                  selectedMaterialIds={selectedMaterialIds}
                />
              );
            }

            const material = item.materials[0];
            return (
              <MaterialRow
                active={material.id === selectedMaterialId}
                href={materialHref(material)}
                material={material}
                openTaskLabel={materialTaskActionLabel(material.name)}
                onOpenTask={taskOpenerForMaterial(material)}
                onSelect={selectMode && isPdfMaterial(material) ? () => toggleSelection(material) : () => onSelectMaterial(material)}
                onToggleSelection={selectMode && isPdfMaterial(material) ? () => toggleSelection(material) : undefined}
                selectedForExport={selectedMaterialIds.has(material.id)}
              />
            );
          }}
          emptyState={
            filteredCount === 0 ? (
              <EmptyState
                title={typeFilter === "pdf" ? "Keine PDFs gefunden" : "Keine Seiten & Ressourcen gefunden"}
                description="Probiere einen anderen Typ-Filter oder wähle „Alle Typen“."
              />
            ) : null
          }
        />
        <div aria-hidden="true" className="h-[80dvh]" />
      </div>
    </div>
  );
}

function buildMaterialHref(courseId: string, material: Material): string {
  return buildNavigatorURL(openDocument(homeState(), {
    kind: "material",
    courseId,
    materialId: material.id,
  }));
}

type MaterialDisplayItem = {
  key: string;
  materials: [Material] | [Material, Material];
};

function buildMaterialDisplayItems(sectionMaterials: Material[]): MaterialDisplayItem[] {
  const solutionBySheetKey = new Map<string, Material>();
  for (const material of sectionMaterials) {
    const key = taskSheetKey(material.name);
    if (key && isSolutionMaterialName(material.name)) {
      solutionBySheetKey.set(key, material);
    }
  }

  const usedIds = new Set<string>();
  const items: MaterialDisplayItem[] = [];
  for (const material of sectionMaterials) {
    if (usedIds.has(material.id)) {
      continue;
    }

    const key = taskSheetKey(material.name);
    const solution = key && !isSolutionMaterialName(material.name) ? solutionBySheetKey.get(key) : undefined;
    if (solution && solution.id !== material.id) {
      usedIds.add(material.id);
      usedIds.add(solution.id);
      items.push({ key: `pair:${material.id}:${solution.id}`, materials: [material, solution] });
      continue;
    }

    usedIds.add(material.id);
    items.push({ key: material.id, materials: [material] });
  }
  return items;
}

function taskIdForPairedSheetMaterial(
  material: Material,
  materials: Material[],
  taskIdForMaterial?: (material: Material) => string | null,
): string | null {
  if (!taskIdForMaterial || !isSolutionMaterialName(material.name)) {
    return null;
  }

  const sheetKey = taskSheetKey(material.name);
  if (!sheetKey) {
    return null;
  }

  const pairedSheet = materials.find((candidate) =>
    candidate.id !== material.id
    && taskSheetKey(candidate.name) === sheetKey
    && !isSolutionMaterialName(candidate.name)
  );

  return pairedSheet ? taskIdForMaterial(pairedSheet) : null;
}

function taskSheetKey(name: string): string | null {
  const match = name.toLowerCase().match(/aufgabenblatt\s*0*(\d+)/i);
  return match ? match[1] : null;
}

function isSolutionMaterialName(name: string): boolean {
  return /lösung|loesung|solution/i.test(name);
}

function materialTaskActionLabel(name: string): string {
  const key = taskSheetKey(name);
  return key ? `Aufgabe ${key.padStart(2, "0")}` : "Aufgabe";
}

function MaterialSectionSelectionCheckbox({
  materials,
  onToggle,
  sectionLabel,
  selectedMaterialIds,
}: {
  materials: Material[];
  onToggle: () => void;
  sectionLabel: string;
  selectedMaterialIds: Set<string>;
}) {
  const pdfMaterials = materials.filter(isPdfMaterial);
  const selectedCount = pdfMaterials.filter((material) => selectedMaterialIds.has(material.id)).length;
  const checked = selectedCount === 0 ? false : selectedCount === pdfMaterials.length ? true : "indeterminate";

  if (pdfMaterials.length === 0) {
    return null;
  }

  return (
    <Checkbox
      aria-label={`${sectionLabel} auswählen`}
      checked={checked}
      onCheckedChange={onToggle}
    />
  );
}

type MaterialExportAction = "print" | "pdf" | "zip";

type MaterialExportActionState =
  | { kind: "idle" }
  | { action: MaterialExportAction; kind: "running" }
  | { action: MaterialExportAction; kind: "done" }
  | { action: MaterialExportAction; kind: "failed"; message: string };

function MaterialSelectionControls({
  actionState,
  allVisiblePDFsSelected,
  disabled,
  onExportPDF,
  onPrint,
  onToggleSelectMode,
  onToggleVisiblePDFSelection,
  onZip,
  selectMode,
  selectedCount,
  visiblePDFCount,
}: {
  actionState: MaterialExportActionState;
  allVisiblePDFsSelected: boolean;
  disabled: boolean;
  onExportPDF: () => void;
  onPrint: () => void;
  onToggleSelectMode: () => void;
  onToggleVisiblePDFSelection: () => void;
  onZip: () => void;
  selectMode: boolean;
  selectedCount: number;
  visiblePDFCount: number;
}) {
  const actionRunning = actionState.kind === "running";
  const actionDisabled = disabled || actionRunning || selectedCount === 0;
  const status = materialExportStatusLabel(actionState);

  if (visiblePDFCount === 0 && selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <button
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          selectMode
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
        disabled={visiblePDFCount === 0 || actionRunning}
        onClick={onToggleSelectMode}
        type="button"
      >
        <CheckSquare aria-hidden className="size-4" />
        {selectMode ? "Fertig" : "Select"}
      </button>
      {selectMode ? (
        <button
          className={cn(
            "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors",
            allVisiblePDFsSelected
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
          disabled={visiblePDFCount === 0 || actionRunning}
          onClick={onToggleVisiblePDFSelection}
          type="button"
        >
          {allVisiblePDFsSelected ? "Keine" : "Alle"}
        </button>
      ) : null}
      {selectMode ? (
        <span aria-label={`${selectedCount} ausgewählt`} className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-secondary px-3 text-sm font-medium text-muted-foreground">
          {selectedCount}
        </span>
      ) : null}
      {selectMode ? (
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
          disabled={actionDisabled}
          onClick={onPrint}
          type="button"
        >
          <Printer aria-hidden className="size-4" />
          Drucken
        </button>
      ) : null}
      {selectMode ? (
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
          disabled={actionDisabled}
          onClick={onExportPDF}
          type="button"
        >
          <Download aria-hidden className="size-4" />
          PDF
        </button>
      ) : null}
      {selectMode ? (
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
          disabled={actionDisabled}
          onClick={onZip}
          type="button"
        >
          <FileArchive aria-hidden className="size-4" />
          ZIP
        </button>
      ) : null}
      {selectMode && status ? (
        <span className={cn("ml-1 text-sm font-medium", actionState.kind === "failed" ? "text-destructive" : "text-muted-foreground")}>
          {status}
        </span>
      ) : null}
    </div>
  );
}

function materialExportStatusLabel(state: MaterialExportActionState): string | null {
  if (state.kind === "running") {
    return state.action === "print" ? "Bereite Druck vor..." : "Export läuft...";
  }
  if (state.kind === "done") {
    return state.action === "print" ? "Druckansicht geöffnet." : "Download gestartet.";
  }
  if (state.kind === "failed") {
    return state.message;
  }
  return null;
}

function MaterialTypeFilterSelect({
  filter,
  onFilterChange,
}: {
  filter: MaterialTypeFilter;
  onFilterChange: (filter: MaterialTypeFilter) => void;
}) {
  return (
    <Select value={filter} onValueChange={(value) => onFilterChange(value as MaterialTypeFilter)}>
      <SelectTrigger
        aria-label="Materialtyp filtern"
        className={cn(
          "flex !h-11 !w-11 !min-w-[44px] !max-w-[44px] shrink-0 items-center justify-center rounded-full border-0 !p-0 shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&>svg]:hidden [&>span:last-child]:hidden",
          filter !== "all" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <span className="flex items-center justify-center">
          <Filter className="size-5 text-current" aria-hidden />
        </span>
      </SelectTrigger>
      <SelectContent
        className="rounded-3xl border-0 bg-card p-2 text-card-foreground shadow-xl"
        position="popper"
        sideOffset={6}
      >
        <SelectItem className="rounded-2xl px-3 py-2.5" value="all">
          <div className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>Alle Ressourcen</span>
          </div>
        </SelectItem>
        <SelectItem className="rounded-2xl px-3 py-2.5" value="pdf">
          <div className="flex items-center gap-2">
            <FileIcon filename="example.pdf" size={16} />
            <span>PDFs</span>
          </div>
        </SelectItem>
        <SelectItem className="rounded-2xl px-3 py-2.5" value="pages">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>Seiten & Ressourcen</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
