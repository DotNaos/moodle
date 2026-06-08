import { auth } from "@clerk/nextjs/server";

import {
  codexOutputSchema,
  type CodexChatMessage,
} from "@/lib/codex-actions";
import { withMoodlePrompt } from "@/lib/codex-prompt";
import { codexRuntimeErrorMessage } from "@/lib/codex-runtime";
import { MOODLE_SERVICES_URL, moodleInternalHeaders, proxyServiceResponse } from "@/lib/moodle-services";

export const runtime = "nodejs";
export const maxDuration = 300;

type CodexRunBody = {
  prompt?: unknown;
  images?: unknown;
  messages?: unknown;
  model?: unknown;
  reasoningEffort?: unknown;
  moodleContext?: unknown;
  stream?: unknown;
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CodexRunBody;
  try {
    body = (await request.json()) as CodexRunBody;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const upstreamAccept = request.headers.get("accept")?.includes("application/x-ndjson")
    ? "application/x-ndjson"
    : "application/json";

  try {
    const upstreamResponse = await fetch(`${MOODLE_SERVICES_URL}/api/codex/run`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...moodleInternalHeaders(userId),
        "Accept": upstreamAccept,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: withMoodlePrompt(prompt, body.moodleContext, parseMessages(body.messages)),
        images: parseImages(body.images),
        model: parseOptionalString(body.model),
        reasoningEffort: parseOptionalString(body.reasoningEffort),
        outputSchema: codexOutputSchema,
        stream: body.stream === true,
      }),
    });

    return proxyServiceResponse(upstreamResponse, responseContentType(upstreamAccept));
  } catch (error) {
    return Response.json({ error: codexRuntimeErrorMessage(error) }, { status: 500 });
  }
}

function parseImages(value: unknown): Array<{ name: string; dataUrl: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((image): Array<{ name: string; dataUrl: string }> => {
    if (!image || typeof image !== "object") {
      return [];
    }
    const name = "name" in image ? image.name : null;
    const dataUrl = "dataURL" in image ? image.dataURL : "dataUrl" in image ? image.dataUrl : null;
    if (typeof name !== "string" || typeof dataUrl !== "string") {
      return [];
    }
    if (!dataUrl.startsWith("data:image/") || dataUrl.length > 1_200_000) {
      return [];
    }
    return [{
      name: name.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "pdf-page.jpg",
      dataUrl,
    }];
  }).slice(0, 40);
}

function parseMessages(value: unknown): CodexChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((message): CodexChatMessage[] => {
    if (!message || typeof message !== "object") {
      return [];
    }
    const role = "role" in message ? message.role : null;
    const text = "text" in message ? message.text : null;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") {
      return [];
    }
    const trimmed = text.trim();
    return trimmed ? [{ role, text: trimmed.slice(0, 8000) }] : [];
  }).slice(-12);
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function responseContentType(accept: string): string {
  return accept === "application/x-ndjson"
    ? "application/x-ndjson; charset=utf-8"
    : "application/json; charset=utf-8";
}
