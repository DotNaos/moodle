"use client";

import { ChevronRight, File, Folder, FolderOpen, HardDrive, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { useCodexFiles } from "@/hooks/use-codex-files";
import { buildWorkspaceTree, formatFileSize, type WorkspaceTreeNode } from "@/lib/codex-files";
import { cn } from "@/lib/utils";

type WorkspaceFilePanelProps = {
  className?: string;
  reloadKey?: number;
};

export function WorkspaceFilePanel({ className, reloadKey }: WorkspaceFilePanelProps) {
  const { files, loading, error, reload } = useCodexFiles(reloadKey);
  const tree = buildWorkspaceTree(files);

  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col border-l border-border/50 bg-secondary/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3">
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
              <TreeRow key={node.path} depth={0} node={node} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TreeRow({ node, depth }: { node: WorkspaceTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);

  if (!node.dir) {
    return (
      <li
        className="flex items-center gap-2 rounded-md py-1 pr-2 text-sm"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <File aria-hidden className="size-3.5 shrink-0 text-muted-foreground/80" />
        <span className="min-w-0 flex-1 truncate text-foreground/90">{node.name}</span>
        {node.size > 0 ? (
          <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
            {formatFileSize(node.size)}
          </span>
        ) : null}
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
            <TreeRow key={child.path} depth={depth + 1} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
