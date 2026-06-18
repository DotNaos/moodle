import { describe, expect, test } from "bun:test";

import { parsePDFPageHash } from "@/lib/pdf-context";

describe("parsePDFPageHash", () => {
  test("reads page fragments", () => {
    expect(parsePDFPageHash("#page=5")).toBe(5);
    expect(parsePDFPageHash("page=12")).toBe(12);
    expect(parsePDFPageHash("#section=foo&page=3")).toBe(3);
  });

  test("ignores non-page fragments", () => {
    expect(parsePDFPageHash("")).toBeNull();
    expect(parsePDFPageHash("#")).toBeNull();
    expect(parsePDFPageHash("#materials-intro")).toBeNull();
  });

  test("rejects invalid pages", () => {
    expect(parsePDFPageHash("#page=0")).toBeNull();
    expect(parsePDFPageHash("#page=-2")).toBeNull();
    expect(parsePDFPageHash("#page=abc")).toBeNull();
  });
});
