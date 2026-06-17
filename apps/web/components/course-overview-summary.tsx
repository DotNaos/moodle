"use client";

import { CheckCircle2, ChevronRight, Circle, Play } from "lucide-react";
import type { ReactNode } from "react";

import { MaterialFileIcon } from "@/components/dashboard-ui";
import { Skeleton } from "@/components/ui/skeleton";
import type { Material } from "@/lib/dashboard-data";
import { shouldHandleAppLinkClick } from "@/lib/link-events";
import { taskDisplayTitle, type StudyOutline, type StudyTaskOutline } from "@/lib/study-outline";
import { cn } from "@/lib/utils";

const PREVIEW_SLOT_COUNT = 4;

export function RecentMaterialsPreview({
  materialHref,
  materials,
  materialsReady,
  onOpenMaterial,
}: {
  materialHref?: (material: Material) => string;
  materials: Material[];
  materialsReady: boolean;
  onOpenMaterial: (material: Material) => void;
}) {
  const recentMaterials = materials
    .filter(isPdfMaterial)
    .map((material, index) => ({ material, score: materialRecencyScore(material, index) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, PREVIEW_SLOT_COUNT)
    .map((item) => item.material);

  if (recentMaterials.length === 0) {
    return materialsReady ? <PreviewBlankGrid /> : <PreviewSkeletonGrid />;
  }

  return (
    <PreviewGrid>
      {recentMaterials.map((material) => (
        <PreviewButton
          href={materialHref?.(material)}
          icon={<MaterialFileIcon material={material} size={18} />}
          key={material.id}
          meta={formatMaterialMeta(material)}
          title={material.name}
          onOpen={() => onOpenMaterial(material)}
        />
      ))}
    </PreviewGrid>
  );
}

export function TaskProgressPreview({
  materialHref,
  materialsReady,
  onOpenMaterial,
  onOpenTask,
  onSelectTasks,
  taskMaterials,
  tasks,
}: {
  materialHref?: (material: Material) => string;
  materialsReady: boolean;
  onOpenMaterial: (material: Material) => void;
  onOpenTask: (taskId: string) => void;
  onSelectTasks: () => void;
  taskMaterials: Material[];
  tasks: StudyOutline["tasks"];
}) {
  if (tasks.length === 0) {
    return taskMaterials.length > 0 ? (
      <PreviewGrid>
        {taskMaterials.slice(0, PREVIEW_SLOT_COUNT).map((material) => (
          <PreviewButton
            href={materialHref?.(material)}
            icon={<Circle aria-hidden className="size-5" />}
            iconVariant="plain"
            key={material.id}
            meta={material.sectionName ?? "Aufgabenblatt"}
            title={material.name}
            onOpen={() => onOpenMaterial(material)}
          />
        ))}
      </PreviewGrid>
    ) : materialsReady ? <PreviewBlankGrid /> : <PreviewSkeletonGrid />;
  }

  const doneCount = tasks.filter((task) => isDoneTaskStatus(task.status)).length;
  const startedCount = tasks.filter(isInProgressTask).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const continueTasks = tasks
    .filter(isInProgressTask)
    .slice(0, PREVIEW_SLOT_COUNT);
  const openTasks = tasks
    .filter((task) => !isDoneTaskStatus(task.status) && !isInProgressTask(task))
    .slice(0, PREVIEW_SLOT_COUNT);
  const visibleTasks = continueTasks.length > 0 ? continueTasks : openTasks;
  const primaryTask = visibleTasks[0] ?? null;
  const primaryTaskPrefix = continueTasks.length > 0 ? "Weiter" : "Nächste Aufgabe";

  return (
    <div className="flex flex-col gap-2">
      <button
        className="rounded-3xl bg-secondary/60 px-4 py-3 text-left transition-colors hover:bg-secondary"
        onClick={primaryTask ? () => onOpenTask(primaryTask.id) : onSelectTasks}
        type="button"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-lg font-semibold tracking-tight">
              {doneCount}
              <span className="text-muted-foreground">/{totalCount} erledigt</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {primaryTask
                ? `${primaryTaskPrefix}: ${taskDisplayTitle(primaryTask.sheetTitle, primaryTask.title)}`
                : "Alle Aufgaben sind abgeschlossen."}
            </span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-background px-3 text-sm font-medium">
            {startedCount > 0 ? `${startedCount} begonnen` : "Starten"}
            <Play aria-hidden className="size-3.5" />
          </span>
        </span>
        <span className="mt-3 flex items-center gap-2.5">
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-background">
            <span className="block h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
          </span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{progress}%</span>
        </span>
      </button>

      {visibleTasks.length > 0 ? (
        <PreviewGrid>
          {visibleTasks.map((task) => (
            <PreviewButton
              icon={<TaskProgressIcon status={task.status} />}
              iconVariant="plain"
              key={task.id}
              meta={taskPreviewMeta(task)}
              title={taskDisplayTitle(task.sheetTitle, task.title)}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
        </PreviewGrid>
      ) : null}
    </div>
  );
}

function PreviewButton({
  href,
  icon,
  iconVariant = "badge",
  meta,
  onOpen,
  title,
}: {
  href?: string;
  icon?: ReactNode;
  iconVariant?: "badge" | "plain";
  meta?: string;
  onOpen: () => void;
  title: string;
}) {
  const className = "flex h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-secondary";
  const content = (
    <>
      {icon ? (
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center text-muted-foreground",
            iconVariant === "badge" && "rounded-full bg-secondary",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-1 text-sm font-semibold leading-snug">{title}</span>
        {meta ? <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">{meta}</span> : null}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/70" />
    </>
  );

  if (href) {
    return (
      <a
        className={className}
        href={href}
        onClick={(event) => {
          if (!shouldHandleAppLinkClick(event)) {
            return;
          }
          event.preventDefault();
          onOpen();
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={className}
      onClick={onOpen}
      type="button"
    >
      {content}
    </button>
  );
}

function PreviewGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[13.5rem] grid-cols-1 grid-rows-4 gap-2 sm:h-[6.5rem] sm:grid-cols-2 sm:grid-rows-2">
      {children}
    </div>
  );
}

function PreviewSkeletonGrid() {
  return (
    <PreviewGrid>
      {Array.from({ length: PREVIEW_SLOT_COUNT }, (_, index) => (
        <div className="flex h-12 items-center gap-3 rounded-2xl px-3 py-2.5" key={index}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </span>
        </div>
      ))}
    </PreviewGrid>
  );
}

function PreviewBlankGrid() {
  return (
    <PreviewGrid>
      {Array.from({ length: PREVIEW_SLOT_COUNT }, (_, index) => (
        <div className="h-12" key={index} />
      ))}
    </PreviewGrid>
  );
}

function TaskProgressIcon({ status }: { status: string }) {
  if (isDoneTaskStatus(status)) {
    return <CheckCircle2 aria-hidden className="size-5 text-emerald-500" />;
  }
  return isInProgressStatus(status)
    ? <Circle aria-hidden className="size-5 fill-emerald-500/20 text-emerald-500" />
    : <Circle aria-hidden className="size-5" />;
}

function taskPreviewMeta(task: StudyTaskOutline): string {
  const displayTitle = taskDisplayTitle(task.sheetTitle, task.title);
  if (displayTitle === task.sheetTitle) {
    return task.sectionTitle ?? "Aufgabenblatt";
  }
  return task.sheetTitle;
}

function formatMaterialMeta(material: Material): string {
  const date = material.uploadedAt ? new Date(material.uploadedAt) : null;
  const section = material.sectionName ?? material.type ?? "Material";
  if (!date || Number.isNaN(date.getTime())) {
    return section;
  }
  const formattedDate = new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "short",
  }).format(date);
  return `${formattedDate} · ${section}`;
}

function isDoneTaskStatus(status: string): boolean {
  return status === "done" || status === "correct";
}

function isInProgressTask(task: StudyTaskOutline): boolean {
  return !isDoneTaskStatus(task.status) && isInProgressStatus(task.status);
}

function isInProgressStatus(status: string): boolean {
  return status !== "open";
}

function isPdfMaterial(material: Material): boolean {
  const candidates = [material.fileType, material.type, material.name, material.url].filter(Boolean).join(" ");
  return /\.pdf(\?|#|$)/i.test(candidates) || /\bpdf\b|aufgabenblatt|lösung|loesung|folien|slides/i.test(candidates);
}

function materialRecencyScore(material: Material, index: number): number {
  const uploadedAt = material.uploadedAt ? Date.parse(material.uploadedAt) : Number.NaN;
  if (Number.isFinite(uploadedAt)) {
    return uploadedAt;
  }

  const numericParts = material.name.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  const lastNumber = numericParts.at(-1);
  if (typeof lastNumber === "number") {
    return lastNumber * 1_000 + index;
  }

  return index;
}
