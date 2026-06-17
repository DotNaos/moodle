export function printPDF(url: string) {
  const frame = document.createElement("iframe");
  frame.src = url;
  frame.title = "PDF print frame";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    frame.remove();
  };

  frame.addEventListener("load", () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(cleanup, 60_000);
    } catch {
      cleanup();
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, { once: true });

  document.body.appendChild(frame);
}
