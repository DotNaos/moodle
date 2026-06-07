#!/usr/bin/env node
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const defaultSourceRoot = "/Users/oli/school/terms/FS26/courses/high-performance-computing";
const sourceRoot = path.resolve(process.argv[2] ?? defaultSourceRoot);
const slug = process.argv[3] ?? path.basename(sourceRoot);
const targetRoot = path.join(repoRoot, "apps/web/study-bundles", slug);

const keepDirs = [".extracted", ".raw", "script", "tasks"];

async function main() {
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });

  for (const dir of keepDirs) {
    await cp(path.join(sourceRoot, dir), path.join(targetRoot, dir), {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(sourceRoot, source);
        if (!relative) return true;
        if (relative.startsWith(".raw/materials/")) return false;
        if (/\.(pdf|pptx?|docx?|zip|mp4|mov)$/i.test(relative)) return false;
        return !relative.includes(".DS_Store");
      },
    });
  }
  await copyExtractedAssets(sourceRoot, targetRoot);
  await rewriteRuntimeAssetLinks(targetRoot);

  await copyFile(path.join(sourceRoot, "README.md"), path.join(targetRoot, "README.md")).catch(() => {});
  const rawIndex = await readFile(path.join(sourceRoot, ".raw/resources.index.yaml"), "utf8").catch(() => "");
  const resources = parseResources(rawIndex);
  const tasks = await buildTasks(sourceRoot, resources);
  const manifest = {
    bundleVersion: 1,
    courseId: String(findCourseId(rawIndex) ?? ""),
    courseSlug: slug,
    courseName: findCourseName(rawIndex) ?? slug,
    importedAt: new Date().toISOString(),
    source: {
      type: "school-workspace",
      courseRoot: sourceRoot,
    },
    script: {
      path: "script/Script.mdx",
      extractedPath: ".extracted/script/Script.mdx",
    },
    tasks,
    resources,
  };
  await writeFile(path.join(targetRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Imported ${slug}: ${tasks.length} task sheets, ${resources.length} resources`);
}

async function copyExtractedAssets(courseRoot, bundleRoot) {
  const extractedRoot = path.join(courseRoot, ".extracted");
  const assetDirs = await findAssetDirs(extractedRoot);
  for (const assetDir of assetDirs) {
    const relative = path.relative(extractedRoot, assetDir);
    await cp(assetDir, path.join(bundleRoot, "assets", relative), { recursive: true });
  }
}

async function findAssetDirs(root) {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (entry.name.endsWith(".assets")) {
        found.push(entryPath);
        continue;
      }
      await walk(entryPath);
    }
  }
  await walk(root);
  return found;
}

async function rewriteRuntimeAssetLinks(bundleRoot) {
  const files = await findMarkdownFiles([
    path.join(bundleRoot, "script"),
    path.join(bundleRoot, "tasks"),
  ]);
  for (const file of files) {
    const documentPath = path.posix.relative(bundleRoot, file).split(path.sep).join("/");
    const documentDir = path.posix.dirname(documentPath);
    const markdown = await readFile(file, "utf8");
    const rewritten = markdown.replace(/src="([^"]*\.extracted\/[^"]+)"/g, (match, rawSrc) => {
      const normalized = path.posix.normalize(path.posix.join(documentDir, rawSrc));
      if (!normalized.startsWith(".extracted/")) return match;
      const assetPath = `assets/${normalized.slice(".extracted/".length)}`;
      const relativeAssetPath = path.posix.relative(documentDir, assetPath);
      return `src="${relativeAssetPath}"`;
    });
    if (rewritten !== markdown) {
      await writeFile(file, rewritten);
    }
  }
}

async function findMarkdownFiles(roots) {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (/\.mdx?$/.test(entry.name)) {
        found.push(entryPath);
      }
    }
  }
  for (const root of roots) {
    await walk(root);
  }
  return found;
}

async function buildTasks(courseRoot, resources) {
  const taskDir = path.join(courseRoot, "tasks");
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(taskDir, { withFileTypes: true }));
  const files = entries
    .filter((entry) => entry.isFile() && /^\d+-.+\.mdx$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const byRawPath = new Map(resources.map((resource) => [resource.rawPath, resource]));
  const taskByNumber = new Map();
  const solutionByNumber = new Map();
  for (const resource of resources) {
    const number = sheetNumber(resource.title);
    if (!number) continue;
    if (resource.kind.startsWith("task")) {
      taskByNumber.set(number, resource);
    }
    if (resource.kind.startsWith("solution")) {
      solutionByNumber.set(number, resource);
    }
  }
  const tasks = [];
  for (const file of files) {
    const relativePath = `tasks/${file}`;
    const markdown = await readFile(path.join(courseRoot, relativePath), "utf8");
    const frontmatter = parseFrontmatter(markdown);
    const title = frontmatter.title ?? titleFromFilename(file);
    const number = sheetNumber(title) ?? sheetNumber(file);
    const sourceTask = normalizeSourcePath("tasks", frontmatter.source_task);
    const taskResource = (sourceTask ? byRawPath.get(sourceTask) : undefined) ?? (number ? taskByNumber.get(number) : undefined);
    const solutionPath = stripDotSlash(frontmatter.solution_page);
    const solutionMarkdown = solutionPath ? await readFile(path.join(courseRoot, "tasks", solutionPath), "utf8").catch(() => "") : "";
    const solutionFrontmatter = parseFrontmatter(solutionMarkdown);
    const solutionBaseDir = path.posix.dirname(`tasks/${solutionPath ?? ""}`);
    const sourcePdf = normalizeSourcePath(solutionBaseDir, solutionFrontmatter.source_pdf);
    const sourceSolution = normalizeSourcePath(solutionBaseDir, solutionFrontmatter.source_solution);
    const solutionResource = (sourcePdf ? byRawPath.get(sourcePdf) : undefined)
      ?? (sourceSolution ? byRawPath.get(sourceSolution) : undefined)
      ?? (number ? solutionByNumber.get(number) : undefined);
    tasks.push({
      id: path.basename(file, ".mdx"),
      title,
      path: relativePath,
      sourceResourceId: taskResource?.resourceId ?? `bundle:${relativePath}`,
      sourceResourceTitle: taskResource?.title ?? title,
      solutionPath: solutionPath ? `tasks/${solutionPath}` : null,
      solutionResourceId: solutionResource?.resourceId ?? null,
      solutionTitle: solutionFrontmatter.title ?? null,
      solutionStatus: frontmatter.solution_status ?? "unknown",
    });
  }
  return tasks;
}

function parseResources(rawIndex) {
  const blocks = rawIndex.split(/\n(?=\s+- id:)/g);
  return blocks.map((block) => {
    const id = valueFor(block, "id");
    const title = valueFor(block, "title");
    const kind = valueFor(block, "kind");
    const rawPath = valueFor(block, "raw_path");
    const filetype = valueFor(block, "filetype");
    if (!id || !rawPath) return null;
    return {
      resourceId: id,
      title: title ?? id,
      kind: `${kind ?? "material"}${filetype ? `/${filetype}` : ""}`,
      rawPath,
    };
  }).filter(Boolean);
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const values = {};
  for (const line of match[1].split("\n")) {
    const item = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!item) continue;
    values[item[1]] = unquote(item[2].trim());
  }
  return values;
}

function valueFor(block, key) {
  const match = block.match(new RegExp(`^\\s*(?:-\\s*)?${key}:\\s*(.+)$`, "m"));
  return match ? unquote(match[1].trim()) : null;
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "null") return null;
  return value;
}

function normalizeSourcePath(fromDir, value) {
  if (!value) return null;
  const normalized = path.posix.normalize(path.posix.join(fromDir, value));
  return normalized.startsWith(".raw/") ? normalized.slice(".raw/".length) : normalized;
}

function stripDotSlash(value) {
  if (!value) return null;
  return value.replace(/^\.\//, "");
}

function titleFromFilename(file) {
  return path.basename(file, ".mdx").replace(/-/g, " ");
}

function sheetNumber(value) {
  const match = String(value).match(/(?:aufgabenblatt|blatt)[^\d]*(\d{1,2})|(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/i);
  const number = match?.[1] ?? match?.[2];
  return number ? number.padStart(2, "0") : null;
}

function findCourseId(rawIndex) {
  return valueFor(rawIndex, "course_id");
}

function findCourseName(rawIndex) {
  return valueFor(rawIndex, "course_name");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
