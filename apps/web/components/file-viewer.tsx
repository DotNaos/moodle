"use client";

import { Columns2, ExternalLink, FileCheck2, FileCode2, FileText } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import type { Material } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { PDFDocumentViewerMode } from "@/components/pdf-document-viewer-mode";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { shouldHandleAppLinkClick } from "@/lib/link-events";
import { findTaskSheetSolutionPair } from "@/lib/material-pairs";
import { buildNavigatorURL, homeState, openDocument } from "@/lib/navigator";
import type { PDFScrollCommand, PDFViewState } from "@/lib/pdf-context";
import { cn } from "@/lib/utils";

type MaterialTextResponse = {
  document?: {
    text?: string;
    title?: string;
  };
  error?: string;
};

export function FileViewer({
  courseId,
  material,
  materials,
  onOpenMaterial,
  pdfScrollCommand,
  onPDFStateChange,
}: {
  courseId: string | null;
  material: Material | null;
  materials: Material[];
  onOpenMaterial?: (material: Material) => void;
  pdfScrollCommand: PDFScrollCommand | null;
  onPDFStateChange: (state: PDFViewState | null) => void;
}) {
  const [text, setText] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const materialKind = useMemo(() => getMaterialKind(material), [material]);
  const taskSheetPair = useMemo(
    () => (materialKind === "pdf" ? findTaskSheetSolutionPair(material, materials) : null),
    [material, materialKind, materials],
  );
  const pdfUrl = useMemo(
    () => (courseId && material && materialKind === "pdf" ? pdfPreviewUrl(courseId, material) : ""),
    [courseId, material, materialKind],
  );

  useEffect(() => {
    if (!taskSheetPair) {
      setSplitOpen(false);
    }
  }, [taskSheetPair]);

  useEffect(() => {
    setText("");
    setError(null);

    if (!courseId || !material || materialKind === "pdf") {
      setLoadingText(false);
      return;
    }

    const controller = new AbortController();
    setLoadingText(true);

    void fetch(textPreviewUrl(courseId, material.id), { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as MaterialTextResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? `Preview failed with ${response.status}`);
        }
        setText(payload.document?.text?.trim() || "No readable text preview is available for this file.");
      })
      .catch((previewError) => {
        if (!controller.signal.aborted) {
          setError(previewError instanceof Error ? previewError.message : "Preview failed.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingText(false);
        }
      });

    return () => controller.abort();
  }, [courseId, material, materialKind]);

  useEffect(() => {
    if (materialKind !== "pdf") {
      onPDFStateChange(null);
    }
  }, [materialKind, onPDFStateChange]);

  if (!material || !courseId) {
    return (
      <section className="grid min-h-0 flex-1 place-items-center border-t border-border/60">
        <div className="max-w-xs text-center">
          <FileText className="mx-auto mb-3 text-muted-foreground" aria-hidden />
          <p className="font-medium">No file selected</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a material to preview it here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-border/60">
      {materialKind !== "pdf" ? (
        <div className="flex min-h-16 items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Preview</p>
            <h3 className="truncate text-base font-semibold tracking-tight">{material.name}</h3>
          </div>
          {material.url ? (
            <Button asChild variant="secondary">
              <a href={material.url} target="_blank" rel="noreferrer">
                Open <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden bg-muted">
        {materialKind === "pdf" ? (
          splitOpen && taskSheetPair ? (
            <SplitPDFPairViewer
              courseId={courseId}
              material={material}
              onOpenMaterial={onOpenMaterial}
              onPDFStateChange={onPDFStateChange}
              onSplitOpenChange={setSplitOpen}
              pair={taskSheetPair}
              pdfScrollCommand={pdfScrollCommand}
            />
          ) : (
            <PDFDocumentViewerMode
              allowFloat
              courseId={courseId}
              externalUrl={material.url}
              materialId={material.id}
              onStateChange={onPDFStateChange}
              scrollCommand={pdfScrollCommand}
              title={material.name}
              toolbarExtra={
                taskSheetPair ? (
                  <TaskSheetPairActions
                    courseId={courseId}
                    onOpenMaterial={onOpenMaterial}
                    onSplitOpenChange={setSplitOpen}
                    pair={taskSheetPair}
                    splitOpen={false}
                  />
                ) : null
              }
              url={pdfUrl}
            />
          )
        ) : loadingText ? (
          <PreviewLoading />
        ) : error ? (
          <PreviewMessage
            icon={<FileText aria-hidden />}
            title="Preview unavailable"
            description={error}
          />
        ) : (
          <div className="h-full min-h-[520px] overflow-auto bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <FileCode2 aria-hidden />
              Text preview
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">{text}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

function SplitPDFPairViewer({
  courseId,
  material,
  onOpenMaterial,
  onPDFStateChange,
  onSplitOpenChange,
  pair,
  pdfScrollCommand,
}: {
  courseId: string;
  material: Material;
  onOpenMaterial?: (material: Material) => void;
  onPDFStateChange: (state: PDFViewState | null) => void;
  onSplitOpenChange: (open: boolean) => void;
  pair: NonNullable<ReturnType<typeof findTaskSheetSolutionPair>>;
  pdfScrollCommand: PDFScrollCommand | null;
}) {
  const leftMaterial = pair.sheet;
  const rightMaterial = pair.solution;
  const selectedOnLeft = material.id === leftMaterial.id;
  const selectedOnRight = material.id === rightMaterial.id;

  return (
    <div className="flex h-full min-h-0 flex-col gap-px bg-border md:flex-row">
      <div className={cn("min-h-[420px] min-w-0 flex-1 bg-muted md:min-h-0", selectedOnLeft && "md:flex-[1.08]")}>
        <PDFDocumentViewerMode
          courseId={courseId}
          externalUrl={leftMaterial.url}
          materialId={leftMaterial.id}
          onStateChange={selectedOnLeft ? onPDFStateChange : noopPDFStateChange}
          scrollCommand={selectedOnLeft ? pdfScrollCommand : null}
          title={leftMaterial.name}
          toolbarExtra={selectedOnLeft ? (
            <TaskSheetPairActions
              courseId={courseId}
              onOpenMaterial={onOpenMaterial}
              onSplitOpenChange={onSplitOpenChange}
              pair={pair}
              splitOpen
            />
          ) : null}
          url={pdfPreviewUrl(courseId, leftMaterial)}
        />
      </div>
      <div className={cn("min-h-[420px] min-w-0 flex-1 bg-muted md:min-h-0", selectedOnRight && "md:flex-[1.08]")}>
        <PDFDocumentViewerMode
          courseId={courseId}
          externalUrl={rightMaterial.url}
          materialId={rightMaterial.id}
          onStateChange={selectedOnRight ? onPDFStateChange : noopPDFStateChange}
          scrollCommand={selectedOnRight ? pdfScrollCommand : null}
          title={rightMaterial.name}
          toolbarExtra={selectedOnRight ? (
            <TaskSheetPairActions
              courseId={courseId}
              onOpenMaterial={onOpenMaterial}
              onSplitOpenChange={onSplitOpenChange}
              pair={pair}
              splitOpen
            />
          ) : null}
          url={pdfPreviewUrl(courseId, rightMaterial)}
        />
      </div>
    </div>
  );
}

function TaskSheetPairActions({
  courseId,
  onOpenMaterial,
  onSplitOpenChange,
  pair,
  splitOpen,
}: {
  courseId: string;
  onOpenMaterial?: (material: Material) => void;
  onSplitOpenChange: (open: boolean) => void;
  pair: NonNullable<ReturnType<typeof findTaskSheetSolutionPair>>;
  splitOpen: boolean;
}) {
  const counterpartLabel = pair.role === "sheet" ? "Lösung" : "Aufgabenblatt";
  const SwitchIcon = pair.role === "sheet" ? FileCheck2 : FileText;
  const splitTooltip = splitOpen
    ? "Split View schließen"
    : "Aufgabenblatt und Lösung nebeneinander öffnen";
  const counterpartHref = buildNavigatorURL(openDocument(homeState(), {
    kind: "material",
    courseId,
    materialId: pair.counterpart.id,
  }));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild aria-label={`${counterpartLabel} öffnen`} size="sm" variant="ghost">
            <a
              href={counterpartHref}
              onClick={(event) => {
                if (!onOpenMaterial || !shouldHandleAppLinkClick(event)) {
                  return;
                }
                event.preventDefault();
                onOpenMaterial(pair.counterpart);
              }}
            >
              <SwitchIcon aria-hidden />
              <span className="hidden lg:inline">{counterpartLabel}</span>
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{counterpartLabel} öffnen</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={splitTooltip}
            aria-pressed={splitOpen}
            className={splitOpen ? "bg-secondary text-foreground" : undefined}
            onClick={() => onSplitOpenChange(!splitOpen)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <SplitViewIcon activeRole={pair.role} splitOpen={splitOpen} />
            <span className="hidden lg:inline">{splitOpen ? "Einzeln" : "Side by side"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{splitTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SplitViewIcon({ activeRole, splitOpen }: { activeRole: "sheet" | "solution"; splitOpen: boolean }) {
  const sheetVisible = splitOpen || activeRole === "sheet";
  const solutionVisible = splitOpen || activeRole === "solution";

  return (
    <span className="relative inline-grid size-4 place-items-center" aria-hidden>
      <span
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[42%] rounded-[3px] transition-colors",
          sheetVisible ? activeRole === "sheet" ? "bg-sky-500/70" : "bg-sky-500/25" : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "absolute inset-y-0.5 right-0.5 w-[42%] rounded-[3px] transition-colors",
          solutionVisible ? activeRole === "solution" ? "bg-amber-500/70" : "bg-amber-500/25" : "bg-transparent",
        )}
      />
      <Columns2 className="relative size-4" aria-hidden />
    </span>
  );
}

function noopPDFStateChange() {
  // Secondary split-view PDFs should not replace the active chat/PDF context.
}

function PreviewLoading() {
  return (
    <div className="grid h-full min-h-[520px] place-items-center bg-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden />
        Loading preview
      </div>
    </div>
  );
}

function PreviewMessage({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="grid h-full min-h-[520px] place-items-center bg-card px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 flex justify-center text-muted-foreground">{icon}</div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function getMaterialKind(material: Material | null): "pdf" | "text" {
  const value = [material?.fileType, material?.url, material?.name].filter(Boolean).join(" ").toLowerCase();
  return value.includes("pdf") ? "pdf" : "text";
}

function pdfPreviewUrl(courseId: string, material: Material): string {
  return `/api/moodle/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(material.id)}/pdf`;
}

function textPreviewUrl(courseId: string, materialId: string): string {
  return `/api/moodle/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(materialId)}/text`;
}
