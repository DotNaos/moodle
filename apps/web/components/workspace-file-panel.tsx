"use client";

import { ChevronRight, File, Folder, FolderOpen, HardDrive, PanelRightClose, RefreshCw } from "lucide-react";
import { useState } from "react";

import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Spinner } from "@/components/ui/spinner";
import { useCodexFiles } from "@/hooks/use-codex-files";
import { buildWorkspaceTree, formatFileSize, type WorkspaceTreeNode } from "@/lib/codex-files";
import { cn } from "@/lib/utils";

type WorkspaceFilePanelProps = {
  className?: string;
  reloadKey?: number;
};

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
}

function fileContentUrl(path: string): string {
  return `/api/codex/files?path=${encodeURIComponent(path)}`;
}

export function WorkspaceFilePanel({ className, reloadKey }: WorkspaceFilePanelProps) {
  const { files, loading, error, reload } = useCodexFiles(reloadKey);
  const [collapsed, setCollapsed] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const tree = buildWorkspaceTree(files);

  function openFile(path: string) {
    const url = fileContentUrl(path);
    if (isImagePath(path)) {
      setLightboxSrc(url);
    } else if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex w-11 shrink-0 flex-col items-center gap-2 border-l border-border/50 bg-secondary/30 py-3",
          className,
        )}
      >
        <button
          aria-label="Ablage öffnen"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          type="button"
          onClick={() => setCollapsed(false)}
        >
          <HardDrive className="size-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col border-l border-border/50 bg-secondary/30",
        className,
      )}
    >
      {lightboxSrc ? <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} /> : null}
      <div className="flex items-center gap-1 px-4 py-3">
        <HardDrive aria-hidden className="size-4 text-muted-foreground" />
        <h2 className="flex-1 text-sm font-semibold tracking-tight">Ablage</h2>
        <button
          aria-label="Aktualisieren"
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          disabled={loading}
          type="button"
          onClick={reload}
        >
          <RefreshCw aria-hidden className={cn("size-3.5", loading ? "animate-spin" : "")} />
        </button>
        <button
          aria-label="Ablage einklappen"
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          type="button"
          onClick={() => setCollapsed(true)}
        >
          <PanelRightClose aria-hidden className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {error ? (
          <p className="px-2 py-3 text-xs text-destructive">{error}</p>
        ) : loading && files.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Spinner aria-hidden className="size-3.5" />
            Lädt…
          </div>
        ) : tree.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Noch keine Dateien in deinem Workspace.
          </p>
        ) : (
          <ul className="flex flex-col">
            {tree.map((node) => (
              <TreeRow key={node.path} depth={0} node={node} onOpenFile={openFile} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TreeRow({
  node,
  depth,
  onOpenFile,
}: {
  node: WorkspaceTreeNode;
  depth: number;
  onOpenFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (!node.dir) {
    return (
      <li>
        <button
          className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm transition-colors hover:bg-secondary/70"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          title={`${node.name} öffnen`}
          type="button"
          onClick={() => onOpenFile(node.path)}
        >
          <File aria-hidden className="size-3.5 shrink-0 text-muted-foreground/80" />
          <span className="min-w-0 flex-1 truncate text-foreground/90">{node.name}</span>
          {node.size > 0 ? (
            <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
              {formatFileSize(node.size)}
            </span>
          ) : null}
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm transition-colors hover:bg-secondary/70"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronRight
          aria-hidden
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open ? "rotate-90" : "")}
        />
        {open ? (
          <FolderOpen aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Folder aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{node.name}</span>
      </button>
      {open && node.children.length > 0 ? (
        <ul className="flex flex-col">
          {node.children.map((child) => (
            <TreeRow key={child.path} depth={depth + 1} node={child} onOpenFile={onOpenFile} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
