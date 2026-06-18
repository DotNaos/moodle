import { describe, expect, test } from "bun:test";

import { isHLSStreamUrl, nativeHLSMimeTypes, shouldUseNativeHLS } from "@/lib/webex-recording-playback";

describe("Webex recording playback helpers", () => {
  test("detects HLS playlist URLs with query strings", () => {
    expect(isHLSStreamUrl("https://fhgr.webex.com/video/recording.m3u8?token=redacted")).toBe(true);
  });

  test("does not treat direct mp4 recordings as HLS", () => {
    expect(isHLSStreamUrl("https://fhgr.webex.com/video/recording.mp4?token=redacted")).toBe(false);
  });

  test("checks the native HLS MIME types browsers advertise", () => {
    expect(nativeHLSMimeTypes()).toContain("application/vnd.apple.mpegurl");
    expect(nativeHLSMimeTypes()).toContain("application/x-mpegURL");
  });

  test("uses native HLS for Safari and iOS", () => {
    expect(
      shouldUseNativeHLS(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      ),
    ).toBe(true);
    expect(
      shouldUseNativeHLS(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  test("uses HLS.js for Chromium browsers", () => {
    expect(
      shouldUseNativeHLS(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});
