export function isHLSStreamUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://moodle.local");
    return parsed.pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return /\.m3u8(?:[?#]|$)/i.test(value);
  }
}

export function nativeHLSMimeTypes(): string[] {
  return [
    "application/vnd.apple.mpegurl",
    "application/x-mpegURL",
  ];
}

export function shouldUseNativeHLS(userAgent: string): boolean {
  if (/\b(iPad|iPhone|iPod)\b/i.test(userAgent)) {
    return true;
  }

  return /\bSafari\//i.test(userAgent) && !/\b(Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//i.test(userAgent);
}
