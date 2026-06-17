import { defineCatalog, type Spec } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const GENERATED_UI_LANGUAGE = "json-render";
const MAX_GENERATED_UI_SOURCE_LENGTH = 30_000;

const toneSchema = z.enum(["neutral", "info", "success", "warning", "danger"]);
const quizQuestionSchema = z.object({
  title: z.string().optional(),
  prompt: z.string(),
  type: z.enum(["open", "single", "multiple"]).optional(),
  choices: z.array(z.string()).min(2).max(5).optional(),
  correct: z.array(z.number().int().nonnegative()).max(5).optional(),
  solution: z.array(z.string()).max(4).optional(),
});

export const generatedUICatalog = defineCatalog(schema, {
  components: {
    Stack: {
      props: z.object({
        direction: z.enum(["vertical", "horizontal"]).optional(),
        gap: z.enum(["xs", "sm", "md", "lg"]).optional(),
        align: z.enum(["start", "center", "stretch"]).optional(),
      }),
      slots: ["default"],
      description: "Groups child elements with predictable spacing.",
    },
    Panel: {
      props: z.object({
        title: z.string().optional(),
        tone: toneSchema.optional(),
      }),
      slots: ["default"],
      description: "A subtle grouped area for related learning content.",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["2", "3", "4"]).optional(),
      }),
      description: "A short section heading.",
    },
    Text: {
      props: z.object({
        text: z.string(),
        tone: toneSchema.optional(),
        emphasis: z.enum(["normal", "strong"]).optional(),
      }),
      description: "Plain explanatory text.",
    },
    Callout: {
      props: z.object({
        title: z.string().optional(),
        body: z.string(),
        tone: toneSchema.optional(),
      }),
      description: "A compact hint, warning, success note, or important reminder.",
    },
    List: {
      props: z.object({
        items: z.array(z.string()).min(1).max(8),
        ordered: z.boolean().optional(),
      }),
      description: "A short list of points.",
    },
    Steps: {
      props: z.object({
        items: z.array(z.object({
          title: z.string(),
          detail: z.string().optional(),
          status: z.enum(["todo", "current", "done"]).optional(),
        })).min(1).max(8),
      }),
      description: "A sequence of study or solution steps.",
    },
    FactGrid: {
      props: z.object({
        items: z.array(z.object({
          label: z.string(),
          value: z.string(),
          detail: z.string().optional(),
        })).min(1).max(6),
      }),
      description: "Small facts, definitions, metrics, or comparisons.",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        tone: toneSchema.optional(),
      }),
      description: "A short status or category label.",
    },
    Quiz: {
      props: z.object({
        title: z.string().optional(),
        intro: z.string().optional(),
        questions: z.array(quizQuestionSchema).min(1).max(5),
      }),
      description: "An interactive recall quiz with open, single-choice, or multiple-choice questions.",
    },
  },
  actions: {},
});

export type GeneratedUISpec = Spec;

export type GeneratedUIChunk =
  | { type: "markdown"; text: string }
  | { type: "spec"; spec: GeneratedUISpec; source: string }
  | { type: "pending" }
  | { type: "error" };

type JsonRenderPatch = {
  op: "add" | "replace";
  path: string;
  value: unknown;
};

export function generatedUIPromptBlock(): string {
  return [
    "Generative UI:",
    "- When a visual study aid would help, you may append exactly one fenced json-render block after your normal answer.",
    "- The block must use this fence language exactly: ```json-render",
    "- The block must contain only one JSON spec with root and elements.",
    "- Do not output JSON Patch, JSONL patch operations, or separate lines like {\"op\":\"add\",\"path\":...}.",
    "- Use only the catalog below. Do not invent component names, props, HTML, JavaScript, or event handlers.",
    "- Keep the UI small: prefer 3-6 elements and only include it when it adds real value.",
    "- If the user asks to be quizzed, tested, or abgefragt, prefer one Quiz component with 2-5 questions.",
    "",
    generatedUICatalog.prompt({
      customRules: [
        "Do not use actions, on handlers, forms, navigation, external links, images, or arbitrary HTML.",
        "Use concise text. For task feedback, prefer Steps, Callout, List, FactGrid, and Quiz.",
        "For Quiz questions, include correct zero-based choice indexes when choices are present and include a short solution.",
        "Do not include secrets, raw Moodle URLs, tokens, cookies, or session identifiers in props.",
      ],
    }),
    "",
    "Example:",
    "```json-render",
    JSON.stringify({
      root: "panel",
      elements: {
        panel: {
          type: "Panel",
          props: { title: "Lernplan", tone: "info" },
          children: ["steps"],
        },
        steps: {
          type: "Steps",
          props: {
            items: [
              { title: "Begriff klaeren", detail: "Schreibe die Definition in eigenen Worten.", status: "done" },
              { title: "Beispiel rechnen", detail: "Teste die Regel an einem kleinen Beispiel.", status: "current" },
            ],
          },
          children: [],
        },
      },
    }, null, 2),
    "```",
  ].join("\n");
}

export function splitGeneratedUIContent(text: string): GeneratedUIChunk[] {
  const chunks: GeneratedUIChunk[] = [];
  const fencePattern = /```([a-zA-Z0-9_-]+)[^\n]*\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(text)) !== null) {
    const [fullMatch, language, body] = match;
    const start = match.index;
    const end = start + fullMatch.length;
    if (start > cursor) {
      pushMarkdown(chunks, text.slice(cursor, start));
    }

    if (language.toLowerCase() !== GENERATED_UI_LANGUAGE) {
      pushMarkdown(chunks, fullMatch);
      cursor = end;
      continue;
    }

    const parsed = parseGeneratedUISpec(body);
    if (parsed) {
      chunks.push({ type: "spec", spec: parsed, source: body });
    } else {
      chunks.push({ type: "error" });
    }
    cursor = end;
  }

  if (cursor < text.length) {
    pushTrailingContent(chunks, text.slice(cursor));
  }

  return chunks.length > 0 ? chunks : [{ type: "markdown", text }];
}

export function stripGeneratedUIBlocks(text: string): string {
  return splitGeneratedUIContent(text)
    .map((chunk) => chunk.type === "markdown" ? chunk.text : "")
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseGeneratedUISpec(source: string): GeneratedUISpec | null {
  if (source.length > MAX_GENERATED_UI_SOURCE_LENGTH) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = normalizeSpecCandidate(JSON.parse(source));
  } catch {
    return null;
  }

  const result = generatedUICatalog.validate(parsed);
  if (!result.success || !result.data) {
    return null;
  }

  const sanitized = sanitizeSpec(result.data as Spec);
  if (!isSafeSpec(sanitized)) {
    return null;
  }

  return sanitized;
}

function parseGeneratedUIPatchSpec(source: string): GeneratedUISpec | null {
  if (source.length > MAX_GENERATED_UI_SOURCE_LENGTH) {
    return null;
  }
  const patches = source
    .split(/\r?\n/)
    .map((line) => parsePatchLine(line.trim()))
    .filter((patch): patch is JsonRenderPatch => patch !== null);
  if (patches.length === 0) {
    return null;
  }

  const candidate: unknown = {};
  for (const patch of patches) {
    applyJsonPointer(candidate, patch.path, patch.value);
  }
  return parseGeneratedUISpec(JSON.stringify(resolveStateBindings(candidate)));
}

function sanitizeSpec(spec: Spec): Spec {
  return {
    ...spec,
    elements: Object.fromEntries(
      Object.entries(spec.elements).map(([key, element]) => {
        const nextElement = { ...element };
        if (nextElement.visible == null) {
          delete nextElement.visible;
        }
        return [key, nextElement];
      }),
    ),
  };
}

function normalizeSpecCandidate(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  const spec = value as { elements?: unknown };
  if (!spec.elements || typeof spec.elements !== "object") {
    return value;
  }

  const elements = Object.fromEntries(
    Object.entries(spec.elements as Record<string, unknown>).map(([key, element]) => {
      if (!element || typeof element !== "object") {
        return [key, element];
      }
      const candidate = element as Record<string, unknown>;
      return [
        key,
        {
          ...candidate,
          children: Array.isArray(candidate.children) ? candidate.children : [],
          props: candidate.props && typeof candidate.props === "object" ? candidate.props : {},
          visible: "visible" in candidate ? candidate.visible : null,
        },
      ];
    }),
  );

  return { ...value, elements };
}

function resolveStateBindings(value: unknown, root: unknown = value): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveStateBindings(item, root));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.$state === "string" && Object.keys(record).length === 1) {
    const stateRoot = root && typeof root === "object" ? (root as { state?: unknown }).state : undefined;
    const resolved = readJsonPointer(stateRoot, record.$state) ?? readJsonPointer(root, record.$state);
    return resolved === undefined ? value : resolveStateBindings(resolved, root);
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, resolveStateBindings(item, root)]),
  );
}

function isSafeSpec(spec: Spec): boolean {
  const elementEntries = Object.entries(spec.elements);
  if (elementEntries.length > 40) {
    return false;
  }
  for (const [, element] of elementEntries) {
    if ("on" in element || "repeat" in element || "slot" in element) {
      return false;
    }
  }
  return true;
}

function pushMarkdown(chunks: GeneratedUIChunk[], text: string): void {
  if (!text.trim()) {
    return;
  }
  chunks.push({ type: "markdown", text });
}

function pushTrailingContent(chunks: GeneratedUIChunk[], text: string): void {
  const openFence = /```json-render[^\n]*\n/i.exec(text);
  if (!openFence) {
    pushPatchAwareContent(chunks, text);
    return;
  }
  if (openFence.index > 0) {
    pushPatchAwareContent(chunks, text.slice(0, openFence.index));
  }
  chunks.push({ type: "pending" });
}

function pushPatchAwareContent(chunks: GeneratedUIChunk[], text: string): void {
  let position = 0;
  let markdownStart = 0;

  while (position < text.length) {
    const lineEnd = text.indexOf("\n", position);
    const nextPosition = lineEnd === -1 ? text.length : lineEnd + 1;
    const line = text.slice(position, lineEnd === -1 ? text.length : lineEnd);
    const trimmed = line.trim();

    if (!parsePatchLine(trimmed) && !isLikelyIncompletePatchLine(trimmed)) {
      position = nextPosition;
      continue;
    }

    if (position > markdownStart) {
      pushMarkdown(chunks, text.slice(markdownStart, position));
    }

    const patchStart = position;
    let patchEnd = position;
    let hasIncompletePatch = false;
    while (patchEnd < text.length) {
      const currentLineEnd = text.indexOf("\n", patchEnd);
      const currentNextPosition = currentLineEnd === -1 ? text.length : currentLineEnd + 1;
      const currentLine = text.slice(patchEnd, currentLineEnd === -1 ? text.length : currentLineEnd);
      const currentTrimmed = currentLine.trim();
      if (!currentTrimmed) {
        break;
      }
      if (parsePatchLine(currentTrimmed)) {
        patchEnd = currentNextPosition;
        continue;
      }
      if (isLikelyIncompletePatchLine(currentTrimmed)) {
        hasIncompletePatch = true;
        patchEnd = currentNextPosition;
      }
      break;
    }

    const patchSource = text.slice(patchStart, patchEnd);
    const parsed = hasIncompletePatch ? null : parseGeneratedUIPatchSpec(patchSource);
    chunks.push(parsed ? { type: "spec", spec: parsed, source: patchSource } : { type: "pending" });
    position = patchEnd;
    markdownStart = patchEnd;
  }

  if (markdownStart < text.length) {
    pushMarkdown(chunks, text.slice(markdownStart));
  }
}

function parsePatchLine(line: string): JsonRenderPatch | null {
  if (!line.startsWith("{") || !line.endsWith("}")) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const patch = parsed as { op?: unknown; path?: unknown; value?: unknown };
  if ((patch.op !== "add" && patch.op !== "replace") || typeof patch.path !== "string") {
    return null;
  }
  return { op: patch.op, path: patch.path, value: patch.value };
}

function isLikelyIncompletePatchLine(line: string): boolean {
  return line.startsWith("{") && /"op"\s*:/.test(line);
}

function applyJsonPointer(target: unknown, path: string, value: unknown): void {
  if (!path.startsWith("/")) {
    return;
  }
  const parts = path.slice(1).split("/").map(decodePointerPart);
  let current = target as Record<string, unknown> | unknown[];

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];
    const nextContainer = isArrayIndex(nextPart) ? [] : {};
    if (Array.isArray(current)) {
      const arrayIndex = part === "-" ? current.length : Number(part);
      if (!current[arrayIndex]) {
        current[arrayIndex] = nextContainer;
      }
      current = current[arrayIndex] as Record<string, unknown> | unknown[];
      continue;
    }
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = nextContainer;
    }
    current = current[part] as Record<string, unknown> | unknown[];
  }

  const lastPart = parts[parts.length - 1];
  if (Array.isArray(current)) {
    const arrayIndex = lastPart === "-" ? current.length : Number(lastPart);
    current[arrayIndex] = value;
    return;
  }
  current[lastPart] = value;
}

function readJsonPointer(target: unknown, path: string): unknown {
  if (!path.startsWith("/")) {
    return undefined;
  }
  let current = target;
  for (const part of path.slice(1).split("/").map(decodePointerPart)) {
    if (Array.isArray(current)) {
      current = current[Number(part)];
    } else if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function decodePointerPart(part: string): string {
  return part.replace(/~1/g, "/").replace(/~0/g, "~");
}

function isArrayIndex(value: string): boolean {
  return value === "-" || /^\d+$/.test(value);
}
