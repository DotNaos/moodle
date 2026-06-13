import type { BlueprintNodeData } from "@/components/course-pipeline-blueprint-model";
import { preparePreviewMarkdown } from "@/components/course-pipeline-blueprint-preview";

export type PipelineNodePreview =
  | {
      kind: "json";
      text: string;
    }
  | {
      kind: "markdown";
      text: string;
    };

export function buildPipelineNodePreview(data: BlueprintNodeData): PipelineNodePreview {
  if (supportsRenderedPreview(data)) {
    const markdown = nodeBodyPreviewMarkdown(data.outputPreview);
    if (markdown) return { kind: "markdown", text: markdown };
  }

  return {
    kind: "json",
    text: JSON.stringify(serializableNodeData(data), null, 2),
  };
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
    live: data.live,
    problems: data.problems,
    evidence: data.evidence,
    artifacts: data.artifacts,
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
