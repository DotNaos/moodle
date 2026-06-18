"use client";

import { ExternalLink, FileText, Maximize2, Minimize2, Monitor, MoreVertical, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PDFDocumentViewer } from "@/components/pdf-document-viewer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printPDF } from "@/lib/pdf-print-actions";
import { cn } from "@/lib/utils";
import type { PDFScrollCommand, PDFViewState } from "@/lib/pdf-context";

type PDFViewerMode = "app" | "browser";

type PDFDocumentViewerModeProps = {
  allowFloat?: boolean;
  courseId: string | null;
  embedded?: boolean;
  externalUrl?: string;
  expanded?: boolean;
  materialId: string;
  onExpandedChange?: (expanded: boolean) => void;
  scrollCommand: PDFScrollCommand | null;
  toolbarExtra?: ReactNode;
  title: string;
  url: string;
  onStateChange: (state: PDFViewState | null) => void;
};

const PDF_VIEWER_MODE_STORAGE_KEY = "moodle.pdfViewer.mode";
const PDF_VIEWER_MODE_EVENT = "moodle:pdf-viewer-mode";

export function PDFDocumentViewerMode(props: PDFDocumentViewerModeProps) {
  const {
    allowFloat = false,
    courseId,
    embedded = false,
    externalUrl,
    expanded = false,
    materialId,
    onExpandedChange,
    scrollCommand,
    toolbarExtra,
    title,
    url,
    onStateChange,
  } = props;
  const [mode, setModeState] = useState<PDFViewerMode>("app");
  const [nativeTargetPage, setNativeTargetPage] = useState<{ commandId: number; page: number } | null>(null);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const stored = window.localStorage.getItem(PDF_VIEWER_MODE_STORAGE_KEY);
    if (stored === "app" || stored === "browser") {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const modeValue = event instanceof CustomEvent ? event.detail : window.localStorage.getItem(PDF_VIEWER_MODE_STORAGE_KEY);
      if (modeValue === "app" || modeValue === "browser") {
        setModeState(modeValue);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PDF_VIEWER_MODE_STORAGE_KEY && (event.newValue === "app" || event.newValue === "browser")) {
        setModeState(event.newValue);
      }
    };

    window.addEventListener(PDF_VIEWER_MODE_EVENT, handleModeChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(PDF_VIEWER_MODE_EVENT, handleModeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    setNativeTargetPage(null);
  }, [url]);

  useEffect(() => {
    if (mode !== "browser") {
      return;
    }
    onStateChangeRef.current(null);
  }, [materialId, mode, url]);

  useEffect(() => {
    if (mode !== "browser" || !scrollCommand) {
      return;
    }
    setNativeTargetPage({
      commandId: scrollCommand.id,
      page: Math.max(1, Math.round(scrollCommand.page)),
    });
  }, [mode, scrollCommand]);

  const setMode = useCallback((nextMode: PDFViewerMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(PDF_VIEWER_MODE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new CustomEvent(PDF_VIEWER_MODE_EVENT, { detail: nextMode }));
  }, []);

  const viewerModeMenu = <PDFViewerModeMenuItems mode={mode} onModeChange={setMode} />;

  if (mode === "browser") {
    return (
      <NativeBrowserPDFViewer
        allowFloat={allowFloat}
        expanded={expanded}
        externalUrl={externalUrl}
        onExpandedChange={onExpandedChange}
        menuExtra={viewerModeMenu}
        targetPage={nativeTargetPage}
        title={title}
        toolbarExtra={toolbarExtra}
        url={url}
      />
    );
  }

  return (
    <PDFDocumentViewer
      allowFloat={allowFloat}
      courseId={courseId}
      embedded={embedded}
      expanded={expanded}
      externalUrl={externalUrl}
      materialId={materialId}
      onExpandedChange={onExpandedChange}
      onStateChange={onStateChange}
      scrollCommand={scrollCommand}
      title={title}
      menuExtra={viewerModeMenu}
      toolbarExtra={toolbarExtra}
      url={url}
    />
  );
}

function PDFViewerModeMenuItems({
  mode,
  onModeChange,
}: {
  mode: PDFViewerMode;
  onModeChange: (mode: PDFViewerMode) => void;
}) {
  return (
    <>
      <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">PDF-Ansicht</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={mode} onValueChange={(value) => onModeChange(value as PDFViewerMode)}>
        <DropdownMenuRadioItem value="app">
          <FileText aria-hidden />
          <span>App Viewer</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="browser">
          <Monitor aria-hidden />
          <span>Browser Viewer</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  );
}

function NativeBrowserPDFViewer({
  allowFloat,
  expanded,
  externalUrl,
  onExpandedChange,
  menuExtra,
  targetPage,
  title,
  toolbarExtra,
  url,
}: {
  allowFloat: boolean;
  expanded: boolean;
  externalUrl?: string;
  onExpandedChange?: (expanded: boolean) => void;
  menuExtra?: ReactNode;
  targetPage: { commandId: number; page: number } | null;
  title: string;
  toolbarExtra: ReactNode;
  url: string;
}) {
  const [floating, setFloating] = useState(false);
  const nativeUrl = useMemo(() => withPDFPageHash(url, targetPage?.page ?? null), [targetPage?.page, url]);
  const iframeKey = `${url}:${targetPage?.commandId ?? "initial"}`;
  const panelFloating = floating && allowFloat;

  useEffect(() => {
    if (!panelFloating) {
      return;
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFloating(false);
      }
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [panelFloating]);

  return (
    <div className="relative h-full min-h-0">
      {panelFloating ? (
        <button
          aria-label="Großansicht schließen"
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setFloating(false)}
          type="button"
        />
      ) : null}
      <div
        className={cn(
          "overflow-hidden bg-muted",
          panelFloating
            ? "fixed inset-4 z-[60] rounded-3xl shadow-2xl ring-1 ring-border"
            : "relative h-full",
        )}
      >
        {/* Fill the iframe by absolutely anchoring it to this positioned panel
            rather than stretching it as a flex child: a flex-1 iframe collapses
            to its intrinsic height on mobile Chrome, and Safari paints an
            iframe inside a lazily-sized flex item blank. A plain positioned
            block gives both engines a definite box to render into. */}
        <iframe
          key={iframeKey}
          className="absolute inset-0 size-full border-0 bg-card"
          src={nativeUrl}
          title={`Browser PDF viewer: ${title}`}
        />
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex justify-end">
          <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto rounded-full bg-background/90 p-1 shadow-lg ring-1 ring-border/60 backdrop-blur-md">
            {toolbarExtra}
            {allowFloat || onExpandedChange ? (
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
            ) : null}
            {allowFloat ? (
              <Button
                aria-label={panelFloating ? "Großansicht schließen" : "Großansicht öffnen"}
                onClick={() => setFloating((current) => !current)}
                size="icon"
                type="button"
                variant="ghost"
              >
                {panelFloating ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
              </Button>
            ) : onExpandedChange ? (
              <Button
                aria-label={expanded ? "Popup verkleinern" : "Popup maximieren"}
                onClick={() => onExpandedChange(!expanded)}
                size="icon"
                type="button"
                variant="ghost"
              >
                {expanded ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
              </Button>
            ) : null}
            <NativePDFOverflowMenu externalUrl={externalUrl} menuExtra={menuExtra} url={url} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NativePDFOverflowMenu({
  externalUrl,
  menuExtra,
  url,
}: {
  externalUrl?: string;
  menuExtra?: ReactNode;
  url: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="PDF-Aktionen öffnen" size="icon" type="button" variant="ghost">
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-0 bg-card p-1.5 shadow-xl">
        {menuExtra ? (
          <>
            {menuExtra}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            printPDF(url);
          }}
        >
          <Printer aria-hidden />
          <span>PDF drucken</span>
        </DropdownMenuItem>
        {externalUrl ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={externalUrl} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
                <span>In Moodle öffnen</span>
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function withPDFPageHash(url: string, page: number | null): string {
  if (!page) {
    return url;
  }
  const [baseUrl, hash = ""] = url.split("#", 2);
  const params = new URLSearchParams(hash);
  params.set("page", String(page));
  return `${baseUrl}#${params.toString()}`;
}
