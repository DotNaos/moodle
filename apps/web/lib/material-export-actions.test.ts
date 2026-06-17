import { afterEach, describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import type { Material } from "@/lib/dashboard-data";
import {
  buildMaterialPDFUrl,
  buildMergedPDFBlob,
  buildPDFBundleFilename,
  buildPDFZipBlob,
  buildUniquePDFArchiveFilename,
} from "@/lib/material-export-actions";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("material export actions", () => {
  test("builds encoded Moodle PDF URLs", () => {
    expect(buildMaterialPDFUrl("course 42", material("file/a", "Intro.pdf"))).toBe(
      "/api/moodle/courses/course%2042/materials/file%2Fa/pdf",
    );
  });

  test("builds course bundle filenames", () => {
    expect(buildPDFBundleFilename("Deep Learning: FS26", "pdf")).toBe("Deep-Learning-FS26.pdf");
    expect(buildPDFBundleFilename("Deep Learning: FS26", "zip")).toBe("Deep-Learning-FS26.zip");
    expect(buildPDFBundleFilename(undefined, "zip")).toBe("Moodle-PDFs.zip");
  });

  test("deduplicates PDF names inside archives", () => {
    const usedNames = new Set<string>();
    expect(buildUniquePDFArchiveFilename(material("1", "Slides.pdf"), usedNames)).toBe("Slides.pdf");
    expect(buildUniquePDFArchiveFilename(material("2", "Slides.pdf"), usedNames)).toBe("Slides-2.pdf");
    expect(buildUniquePDFArchiveFilename(material("3", "Slides.pdf"), usedNames)).toBe("Slides-3.pdf");
  });

  test("merges selected PDF materials in order", async () => {
    const pdfs = await buildPDFResponses(["first", "second"]);
    mockPDFFetch(pdfs);

    const blob = await buildMergedPDFBlob("course-1", [
      material("first", "First.pdf"),
      material("second", "Second.pdf"),
    ]);
    const merged = await PDFDocument.load(await blob.arrayBuffer());

    expect(blob.type).toBe("application/pdf");
    expect(merged.getPageCount()).toBe(2);
  });

  test("packages selected PDF materials as a zip bundle", async () => {
    const pdfs = await buildPDFResponses(["first", "second"]);
    mockPDFFetch(pdfs);

    const blob = await buildPDFZipBlob("course-1", [
      material("first", "Slides.pdf"),
      material("second", "Slides.pdf"),
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(Object.keys(zip.files).sort()).toEqual(["Slides-2.pdf", "Slides.pdf"]);
  });
});

function material(id: string, name: string): Material {
  return { fileType: "pdf", id, name };
}

async function buildPDFResponses(ids: string[]): Promise<Map<string, Uint8Array>> {
  const responses = new Map<string, Uint8Array>();
  for (const id of ids) {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    responses.set(id, await pdf.save());
  }
  return responses;
}

function mockPDFFetch(pdfs: Map<string, Uint8Array>) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const id = decodeURIComponent(url.split("/materials/")[1]?.split("/pdf")[0] ?? "");
    const bytes = pdfs.get(id);
    if (!bytes) {
      return new Response("missing", { status: 404 });
    }
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: { "content-type": "application/pdf" },
      status: 200,
    });
  }) as typeof fetch;
}
