import type { MouseEvent } from "react";

export function shouldHandleAppLinkClick(event: MouseEvent<HTMLElement>): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}
