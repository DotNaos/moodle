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
  | { type: "spec"; spec: GeneratedUISpec; source: string };

export function generatedUIPromptBlock(): string {
  return [
    "Generative UI:",
    "- When a visual study aid would help, you may append exactly one fenced json-render block after your normal answer.",
    "- The block must use this fence language exactly: ```json-render",
    "- The block must contain only one JSON spec with root and elements.",
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
      pushMarkdown(chunks, fullMatch);
    }
    cursor = end;
  }

  if (cursor < text.length) {
    pushMarkdown(chunks, text.slice(cursor));
  }

  return chunks.length > 0 ? chunks : [{ type: "markdown", text }];
}

export function stripGeneratedUIBlocks(text: string): string {
  return text
    .replace(/```json-render[^\n]*\n[\s\S]*?```/gi, "")
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
