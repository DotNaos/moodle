import type {
  BlueprintNodeData,
  BlueprintRenderedField,
} from "@/components/course-pipeline-blueprint-model";
import { preparePreviewMarkdown } from "@/components/course-pipeline-blueprint-preview";

export type PipelineNodePreview =
  | {
      kind: "json";
      text: string;
    }
  | {
      kind: "markdown";
      text: string;
    }
  | {
      fields: BlueprintRenderedField[];
      jsonText: string;
      kind: "mixed";
    };

export function buildPipelineNodePreview(data: BlueprintNodeData): PipelineNodePreview {
  const rawData = data.bodyData ?? serializableNodeData(data);
  const fields = renderableFields(data.renderedFields);
  const jsonText = JSON.stringify(fields.length > 0 ? omitRenderedFields(rawData, fields) : rawData, null, 2);
  if (fields.length > 0) {
    return { fields, jsonText, kind: "mixed" };
  }

  if (supportsRenderedPreview(data)) {
    const markdown = nodeBodyPreviewMarkdown(data.outputPreview);
    if (markdown) return { kind: "markdown", text: markdown };
  }

  return {
    kind: "json",
    text: jsonText,
  };
}

function omitRenderedFields(rawData: unknown, fields: BlueprintRenderedField[]): unknown {
  const copy = structuredCloneFallback(rawData);
  for (const field of fields) {
    deleteValueAtPath(copy, field.path);
  }
  return removeEmptyValues(copy);
}

function structuredCloneFallback(value: unknown): unknown {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function deleteValueAtPath(target: unknown, path: string) {
  const parts = pathParts(path);
  if (parts.length === 0) return;
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!isRecordOrArray(current)) return;
    current = current[part as keyof typeof current];
  }
  if (!isRecordOrArray(current)) return;
  const last = parts.at(-1);
  if (typeof last === "number" && Array.isArray(current)) {
    current[last] = undefined;
    return;
  }
  if (typeof last === "string" && !Array.isArray(current)) {
    delete current[last];
  }
}

function pathParts(path: string): Array<number | string> {
  const parts: Array<number | string> = [];
  for (const segment of path.split(".")) {
    const key = segment.match(/^([^\[]+)/)?.[1];
    if (key) parts.push(key);
    for (const index of segment.matchAll(/\[(\d+)]/g)) {
      parts.push(Number(index[1]));
    }
  }
  return parts;
}

function isRecordOrArray(value: unknown): value is Record<string, unknown> | unknown[] {
  return Boolean(value) && typeof value === "object";
}

function renderableFields(fields: BlueprintRenderedField[] | undefined): BlueprintRenderedField[] {
  return (fields ?? [])
    .map((field) => {
      if (field.type !== "markdown") return field;
      return {
        ...field,
        value: preparePreviewMarkdown(field.value).markdown,
      };
    })
    .filter((field) => field.value.trim().length > 0);
}

function supportsRenderedPreview(data: BlueprintNodeData): boolean {
  return data.tone === "output" && /website/i.test(data.subtitle) && /output/i.test(data.subtitle);
}

function serializableNodeData(data: BlueprintNodeData): Record<string, unknown> {
  return removeEmptyValues({
    title: data.title,
    subtitle: data.subtitle,
    detail: data.detail,
    tone: data.tone,
    stepKind: data.stepKind,
    status: data.status,
    active: data.active,
    inputs: data.inputs,
    outputs: data.outputs,
    outputPreview: data.outputPreview,
    renderedFields: data.renderedFields,
    live: data.live,
    problems: data.problems,
    evidence: data.evidence,
    artifacts: data.artifacts,
    bodyData: data.bodyData,
    config: data.config,
    meta: data.meta,
    extractionVariants: data.extractionVariants,
    hiddenItems: data.hiddenItems,
  }) as Record<string, unknown>;
}

function removeEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeEmptyValues).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== "object") return value ?? undefined;

  const entries = Object.entries(value)
    .map(([key, item]) => [key, removeEmptyValues(item)] as const)
    .filter(([, item]) => item !== undefined)
    .filter(([, item]) => !Array.isArray(item) || item.length > 0);
  return Object.fromEntries(entries);
}

function nodeBodyPreviewMarkdown(rawPreview: string | undefined): string {
  if (!rawPreview?.trim()) return "";
  const { markdown } = preparePreviewMarkdown(rawPreview);
  return markdown
    .split("\n")
    .filter((line) => !/^\s*(Source|Source task|Original Sources|Solution status|Solution page)\s*:/i.test(line))
    .join("\n")
    .replace(/<!--\s*source:[\s\S]*?-->/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 900);
}
