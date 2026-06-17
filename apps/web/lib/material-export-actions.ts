import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import type { Material } from "@/lib/dashboard-data";
import {
  buildDownloadFilename,
  buildPDFDownloadFilename,
  fetchPDFBlob,
} from "@/lib/pdf-file-actions";

export function buildMaterialPDFUrl(courseId: string, material: Material): string {
  return `/api/moodle/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(material.id)}/pdf`;
}

export function buildPDFBundleFilename(courseName: string | undefined, extension: "pdf" | "zip"): string {
  return buildDownloadFilename(courseName || "Moodle PDFs", extension, "moodle-pdfs");
}

export function buildUniquePDFArchiveFilename(material: Material, usedNames: Set<string>): string {
  const baseName = buildPDFDownloadFilename(material.name);
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const stem = baseName.replace(/\.pdf$/i, "");
  for (let index = 2; ; index += 1) {
    const candidate = `${stem}-${index}.pdf`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }
}

export async function buildMergedPDFBlob(courseId: string, materials: Material[]): Promise<Blob> {
  const merged = await PDFDocument.create();

  for (const material of materials) {
    const blob = await fetchPDFBlob(buildMaterialPDFUrl(courseId, material));
    const source = await PDFDocument.load(await blob.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  const bytes = await merged.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

export async function buildPDFZipBlob(courseId: string, materials: Material[]): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const material of materials) {
    const blob = await fetchPDFBlob(buildMaterialPDFUrl(courseId, material));
    zip.file(buildUniquePDFArchiveFilename(material, usedNames), await blob.arrayBuffer());
  }

  return await zip.generateAsync({ type: "blob" });
}
