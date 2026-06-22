import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import path from "node:path";

type JsonObject = Record<string, unknown>;

export async function promoteCurationToImprovedArtifact(input: {
  artifactRoot: string;
  courseId: string;
  curationFile: string;
  model?: string;
  resourceId: string;
}) {
  const artifactRoot = expandHome(input.artifactRoot);
  const courseRoot = path.join(artifactRoot, "courses", safeSegment(input.courseId));
  const inventory = readJSON(path.join(courseRoot, "inventory", "course-inventory.json"));
  const group = findTaskGroup(inventory, input.resourceId);
  const sheet = asObject(group.sheet);
  const title = String(sheet.name ?? input.resourceId);
  const targetPath = path.join(courseRoot, "improved", "tasks", `${safeSegment(`${input.resourceId}-${title}`)}.mdx`);
  const curation = readJSON(expandHome(input.curationFile));
  const contentMarkdown = String(asObject(curation).contentMarkdown ?? "").trim();
  if (!contentMarkdown) {
    throw new Error(`Curation file has no contentMarkdown: ${input.curationFile}`);
  }

  const body = ensureMoodleSource(stripFrontmatter(contentMarkdown).trim(), input.resourceId);
  const lines = [
    "---",
    "status: codex-improved",
    "ai_used: true",
    `course_id: "${input.courseId}"`,
    "kind: \"task\"",
    `target_id: "${input.resourceId}"`,
    `model: "${escapeFrontmatterValue(input.model ?? modelFromCurationFile(input.curationFile) ?? "codex")}"`,
    `generated_at: "${new Date().toISOString()}"`,
    "---",
    "",
    body,
    "",
  ];
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, lines.join("\n"));
  return {
    ok: true,
    courseId: input.courseId,
    resourceId: input.resourceId,
    title,
    action: "promote-curation",
    generatedAt: new Date().toISOString(),
    source: expandHome(input.curationFile),
    targetPath,
  };
}

export async function runPromotionSelfTest() {
  const root = await mkdtemp(path.join(tmpdir(), "study-promotion-"));
  try {
    const courseRoot = path.join(root, "courses", "test-course");
    await mkdir(path.join(courseRoot, "inventory"), { recursive: true });
    const curationFile = path.join(root, "last-curation-task-task-1-gpt-5.5.md");
    writeJSON(path.join(courseRoot, "inventory", "course-inventory.json"), {
      taskGroups: [
        {
          sheet: { id: "task-1", name: "Task 1" },
        },
      ],
    });
    writeJSON(curationFile, {
      contentMarkdown: [
        "---",
        "status: curated",
        "---",
        "",
        "# Task 1",
        "",
        "Body with an image.",
        "<figure>",
        "<img src=\"/api/study-pipeline/courses/test-course/study-pipeline/extracted-asset?path=asset.png\" alt=\"asset\" />",
        "</figure>",
      ].join("\n"),
    });
    const result = await promoteCurationToImprovedArtifact({
      artifactRoot: root,
      courseId: "test-course",
      curationFile,
      resourceId: "task-1",
    });
    if (!existsSync(result.targetPath)) {
      throw new Error("promotion did not write target file");
    }
    const promoted = readFileSync(result.targetPath, "utf8");
    if (!promoted.includes("status: codex-improved") || !promoted.includes("moodle-resource:task-1")) {
      throw new Error("promotion metadata/source insertion failed");
    }
    if (!promoted.includes("/api/study-pipeline/courses/test-course/study-pipeline/extracted-asset?path=asset.png")) {
      throw new Error("promotion lost image reference");
    }
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function findTaskGroup(inventory: unknown, resourceId: string) {
  const groups = asArray(asObject(inventory).taskGroups);
  const group = groups.find((item) => String(asObject(asObject(item).sheet).id ?? "") === resourceId);
  if (!group) {
    throw new Error(`No task group found for resource ${resourceId}`);
  }
  return asObject(group);
}

function readJSON(filePath: string) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function stripFrontmatter(value: string) {
  if (!value.startsWith("---")) {
    return value;
  }
  const end = value.indexOf("\n---", 3);
  if (end === -1) {
    return value;
  }
  return value.slice(end + "\n---".length);
}

function ensureMoodleSource(value: string, resourceId: string) {
  const sourceLine = `Source: [Moodle resource](moodle-resource:${resourceId})`;
  if (value.includes(`moodle-resource:${resourceId}`)) {
    return value;
  }
  const lines = value.split("\n");
  const headingIndex = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  if (headingIndex === -1) {
    return [sourceLine, "", value].join("\n");
  }
  lines.splice(headingIndex + 1, 0, "", sourceLine);
  return lines.join("\n");
}

function modelFromCurationFile(filePath: string) {
  const name = path.basename(filePath);
  const match = name.match(/-(gpt-[^.]+(?:\.[^.]+)?)\.md$/);
  return match?.[1] ?? null;
}

function escapeFrontmatterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function expandHome(value: string) {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return path.join(homedir(), value.slice(2));
  }
  return value;
}

function safeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replace(/[-._]+$/g, "")
    .replace(/^[-._]+/g, "");
  return normalized ? normalized.slice(0, 96) : "untitled";
}

function writeJSON(filePath: string, payload: unknown) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}
