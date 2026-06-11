export type CodexWorkspaceFile = {
  path: string;
  size: number;
  dir: boolean;
  modifiedAt?: string;
};

type RawWorkspaceFile = string | Partial<CodexWorkspaceFile> | null | undefined;

// Tolerates both the current backend shape ({ files: CodexWorkspaceFile[] })
// and the older stub that returned a flat string[] of paths.
export function normalizeWorkspaceFiles(value: unknown): CodexWorkspaceFile[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry: RawWorkspaceFile): CodexWorkspaceFile[] => {
    if (typeof entry === "string") {
      const path = entry.trim();
      return path ? [{ path, size: 0, dir: path.endsWith("/") }] : [];
    }
    if (entry && typeof entry === "object" && typeof entry.path === "string" && entry.path.trim()) {
      return [
        {
          path: entry.path.trim().replace(/\/+$/, ""),
          size: typeof entry.size === "number" ? entry.size : 0,
          dir: Boolean(entry.dir),
          modifiedAt: typeof entry.modifiedAt === "string" ? entry.modifiedAt : undefined,
        },
      ];
    }
    return [];
  });
}

export type CodexAttachment = {
  id: string;
  kind: "image" | "file" | "resource";
  name: string;
  // Uploaded files (kind image/file): stored under uploads/.
  path?: string;
  size?: number;
  // Referenced Moodle course resources (kind resource): not uploaded.
  courseId?: string;
  materialId?: string;
  // Transient client-only object URL for rendering an image thumbnail in the
  // current session (not persisted, not from the server).
  previewUrl?: string;
};

// A referenced (not uploaded) Moodle course resource.
export function resourceAttachment(material: {
  id: string;
  name: string;
  courseId?: string | null;
}): CodexAttachment {
  return {
    id: `resource:${material.courseId ?? ""}:${material.id}`,
    kind: "resource",
    name: material.name,
    courseId: material.courseId ? String(material.courseId) : undefined,
    materialId: material.id,
  };
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

// Uploads a file into the user's per-user Codex volume (under uploads/) and
// returns its stored attachment descriptor.
export async function uploadWorkspaceFile(file: File): Promise<CodexAttachment> {
  const contentBase64 = await fileToBase64(file);
  const response = await fetch("/api/codex/files", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, contentBase64 }),
  });
  const payload = (await response.json().catch(() => ({}))) as { file?: CodexWorkspaceFile; error?: string };
  if (!response.ok || !payload.file) {
    throw new Error(payload.error ?? `Upload für „${file.name}" fehlgeschlagen (${response.status}).`);
  }
  return {
    id: `upload:${payload.file.path}`,
    kind: file.type.startsWith("image/") ? "image" : "file",
    name: basename(payload.file.path),
    path: payload.file.path,
    size: typeof payload.file.size === "number" ? payload.file.size : file.size,
  };
}

export async function fetchWorkspaceFiles(signal?: AbortSignal): Promise<CodexWorkspaceFile[]> {
  const response = await fetch("/api/codex/files", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as { files?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Workspace files failed with ${response.status}.`);
  }
  return normalizeWorkspaceFiles(payload.files);
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

export type WorkspaceTreeNode = {
  name: string;
  path: string;
  dir: boolean;
  size: number;
  children: WorkspaceTreeNode[];
};

// Builds a nested tree from the flat path list, inferring intermediate
// directories from path segments so it works even if the backend only sends
// leaf files.
export function buildWorkspaceTree(files: CodexWorkspaceFile[]): WorkspaceTreeNode[] {
  const root: WorkspaceTreeNode = { name: "", path: "", dir: true, size: 0, children: [] };

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      const childPath = parts.slice(0, index + 1).join("/");
      let child = node.children.find((candidate) => candidate.name === part);
      if (!child) {
        child = { name: part, path: childPath, dir: isLeaf ? file.dir : true, children: [], size: 0 };
        node.children.push(child);
      }
      if (isLeaf && !file.dir) {
        child.dir = false;
        child.size = file.size;
      }
      node = child;
    });
  }

  sortNodes(root.children);
  return root.children;
}

function sortNodes(nodes: WorkspaceTreeNode[]): void {
  nodes.sort((left, right) => {
    if (left.dir !== right.dir) {
      return left.dir ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  for (const node of nodes) {
    sortNodes(node.children);
  }
}
