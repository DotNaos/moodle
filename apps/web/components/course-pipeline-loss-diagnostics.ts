import type { PDFDocumentStructure } from "@/components/extracted-document-inspector";
import type { BlueprintProblem, TaskOutputRecord } from "@/components/course-pipeline-blueprint-model";

export type LossDiagnosticSummary = {
  evidence: string[];
  unresolvedElementMarkdown: string;
  unresolvedElements: number;
  problems: BlueprintProblem[];
};

type SourceImage = {
  assetId?: string;
  blockId?: string;
  pageNumber: number;
  path?: string;
  resourceName: string;
};

export function buildTaskOutputLossDiagnostics({
  courseId,
  outputs,
  sourceDocuments,
}: {
  courseId?: string;
  outputs: TaskOutputRecord[];
  sourceDocuments: Array<PDFDocumentStructure | null>;
}): LossDiagnosticSummary {
  const sourceImages = sourceDocuments.flatMap((document) => sourceImagesFromDocument(document));
  if (sourceImages.length === 0 || outputs.length === 0) {
    return { evidence: [], unresolvedElementMarkdown: "", unresolvedElements: 0, problems: [] };
  }

  const outputMarkdown = outputs.map(outputMarkdownForTask).join("\n\n");
  const imageReferences = markdownImageReferences(outputMarkdown);
  const unresolvedElements = sourceImages.filter((image) => !imageIsReferenced(image, imageReferences));
  const visibleUnresolvedElements = unresolvedElements.slice(0, 5);
  const problems = visibleUnresolvedElements.map((image) => ({
    label: "Element accountability required",
    detail: [
      `Extraction saw ${image.assetId ?? image.blockId} on page ${image.pageNumber} in ${image.resourceName}.`,
      image.path ? `Asset path: ${image.path}.` : "No web asset path was attached to this extracted image.",
      "The final task output does not reference it. Codex must assign a final outcome: used, ignored, unsupported, or failed.",
    ].join(" "),
    severity: "error" as const,
  }));

  if (unresolvedElements.length > visibleUnresolvedElements.length) {
    problems.push({
      label: "More elements require accountability",
      detail: `${unresolvedElements.length - visibleUnresolvedElements.length} additional detected PDF element(s) need a final outcome.`,
      severity: "error",
    });
  }

  return {
    evidence: [
      `${sourceImages.length} extracted source image block${sourceImages.length === 1 ? "" : "s"} checked`,
      `${imageReferences.length} final output image reference${imageReferences.length === 1 ? "" : "s"} found`,
      `${unresolvedElements.length} detected PDF element${unresolvedElements.length === 1 ? "" : "s"} need a final outcome`,
    ],
    unresolvedElementMarkdown: unresolvedElementsMarkdown(unresolvedElements, courseId),
    unresolvedElements: unresolvedElements.length,
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
  const imagesFromBlocks = document.pages.flatMap((page) =>
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
  const seenAssetIds = new Set(imagesFromBlocks.map((image) => image.assetId).filter(Boolean));
  const diagnosticImages = (document.diagnostics.unusedImageAssets ?? [])
    .filter((assetId) => !seenAssetIds.has(assetId))
    .map((assetId) => {
      const asset = assetsById.get(assetId);
      return {
        assetId,
        blockId: assetId,
        pageNumber: asset?.pageNumber ?? 0,
        path: asset?.path,
        resourceName: document.resource.name,
      };
    });
  const looseEmbeddedImages = document.assets
    .filter((asset) => isExtractedImageAsset(asset.kind, asset.role))
    .filter((asset) => !seenAssetIds.has(asset.id))
    .filter((asset) => !(document.diagnostics.unusedImageAssets ?? []).includes(asset.id))
    .map((asset) => ({
      assetId: asset.id,
      blockId: asset.id,
      pageNumber: asset.pageNumber ?? 0,
      path: asset.path,
      resourceName: document.resource.name,
    }));
  return [...imagesFromBlocks, ...diagnosticImages, ...looseEmbeddedImages];
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

function unresolvedElementsMarkdown(images: SourceImage[], courseId: string | undefined): string {
  if (images.length === 0) return "";
  return [
    "## Elements needing accountability",
    ...images.map((image) => {
      const label = `${image.assetId ?? image.blockId ?? "source image"}${image.pageNumber ? ` · page ${image.pageNumber}` : ""}`;
      const url = image.path ? extractedAssetUrl(courseId, image.path) : "";
      const imageLine = url ? `![${escapeMarkdownAlt(label)}](${url})` : `[image asset: ${label}]`;
      return [
        imageLine,
        `Source: ${image.resourceName}`,
        "Required outcome: used, ignored, unsupported, or failed.",
      ].join("\n\n");
    }),
  ].join("\n\n");
}

function extractedAssetUrl(courseId: string | undefined, path: string): string {
  if (!courseId || !path) return "";
  return `/api/study-pipeline/courses/${encodeURIComponent(courseId)}/study-pipeline/extracted-asset?path=${encodeURIComponent(path)}`;
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/[[\]]/g, "");
}

function isExtractedImageAsset(kind: string, role: string | undefined): boolean {
  const value = `${kind} ${role ?? ""}`.toLowerCase();
  return /embedded_image|extracted_image/.test(value);
}
