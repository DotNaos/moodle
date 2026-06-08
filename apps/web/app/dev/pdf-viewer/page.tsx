import { notFound } from "next/navigation";

import { PDFViewerDebugPage } from "@/components/pdf-viewer-debug-page";

export default function DevPDFViewerPage() {
  if (process.env.NODE_ENV !== "development" && process.env.MOODLE_ENABLE_DEV_ROUTES !== "1") {
    notFound();
  }

  return <PDFViewerDebugPage />;
}
