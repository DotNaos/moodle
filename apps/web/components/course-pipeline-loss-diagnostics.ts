import type { PDFDocumentStructure } from "@/components/extracted-document-inspector";
import type { BlueprintProblem, TaskOutputRecord } from "@/components/course-pipeline-blueprint-model";

export type LossDiagnosticSummary = {
  evidence: string[];
  missingImages: number;
  problems: BlueprintProblem[];
};

type SourceImage = {
  assetId?: string;
  blockId: string;
  pageNumber: number;
  path?: string;
  resourceName: string;
};

export function buildTaskOutputLossDiagnostics({
  outputs,
  sourceDocuments,
}: {
  outputs: TaskOutputRecord[];
  sourceDocuments: Array<PDFDocumentStructure | null>;
}): LossDiagnosticSummary {
  const sourceImages = sourceDocuments.flatMap((document) => sourceImagesFromDocument(document));
  if (sourceImages.length === 0 || outputs.length === 0) {
    return { evidence: [], missingImages: 0, problems: [] };
  }

  const outputMarkdown = outputs.map(outputMarkdownForTask).join("\n\n");
  const imageReferences = markdownImageReferences(outputMarkdown);
  const missingImages = sourceImages.filter((image) => !imageIsReferenced(image, imageReferences));
  const visibleMissingImages = missingImages.slice(0, 5);
  const problems = visibleMissingImages.map((image) => ({
    label: "Extracted image missing from output",
    detail: [
      `Extraction saw ${image.assetId ?? image.blockId} on page ${image.pageNumber} in ${image.resourceName}.`,
      image.path ? `Asset path: ${image.path}.` : "No web asset path was attached to this extracted image.",
      "The final task output does not reference it, so the loss likely happened in Codex/output curation.",
    ].join(" "),
    severity: "warning" as const,
  }));

  if (missingImages.length > visibleMissingImages.length) {
    problems.push({
      label: "More extracted images missing",
      detail: `${missingImages.length - visibleMissingImages.length} additional extracted image(s) are not referenced by the final task output.`,
      severity: "warning",
    });
  }

  return {
    evidence: [
      `${sourceImages.length} extracted source image block${sourceImages.length === 1 ? "" : "s"} checked`,
      `${imageReferences.length} final output image reference${imageReferences.length === 1 ? "" : "s"} found`,
      `${missingImages.length} extracted image block${missingImages.length === 1 ? "" : "s"} not referenced downstream`,
    ],
    missingImages: missingImages.length,
    problems,
  };
}

function outputMarkdownForTask(output: TaskOutputRecord): string {
  return [
    output.promptMarkdown,
    ...output.parts.map((part) => part.promptMarkdown),
  ].filter(Boolean).join("\n\n");
}

function sourceImagesFromDocument(document: PDFDocumentStructure | null): SourceImage[] {
  if (!document) return [];
  const assetsById = new Map(document.assets.map((asset) => [asset.id, asset]));
  return document.pages.flatMap((page) =>
    page.blocks
      .filter((block) => block.type.toLowerCase() === "image")
      .map((block) => {
        const asset = block.assetId ? assetsById.get(block.assetId) : undefined;
        return {
          assetId: block.assetId,
          blockId: block.id,
          pageNumber: block.pageNumber || page.pageNumber,
          path: asset?.path,
          resourceName: document.resource.name,
        };
      }),
  );
}

function markdownImageReferences(markdown: string): string[] {
  const markdownRefs = Array.from(markdown.matchAll(/!\[[^\]]*]\(([^)\s]+)[^)]*\)/g)).map((match) => match[1] ?? "");
  const htmlRefs = Array.from(markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1] ?? "");
  return [...markdownRefs, ...htmlRefs].map(normalizeReference).filter(Boolean);
}

function imageIsReferenced(image: SourceImage, references: string[]): boolean {
  const candidates = [image.assetId, image.path, image.path?.split("/").pop()].map(normalizeReference).filter(Boolean);
  return candidates.some((candidate) => references.some((reference) => reference.includes(candidate)));
}

function normalizeReference(value: string | undefined): string {
  const raw = value ?? "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}
