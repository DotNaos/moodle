import {
  codexOutputSchema,
  type CodexChatMessage,
} from "@/lib/codex-actions";
import { withMoodlePrompt } from "@/lib/codex-prompt";

type CodexRunServicePayloadInput = {
  prompt: string;
  images: Array<{ name: string; dataUrl: string }>;
  attachmentImages: string[];
  messages: CodexChatMessage[];
  model?: string;
  reasoningEffort?: string;
  moodleContext?: unknown;
};

export function buildCodexRunServicePayload(
  input: CodexRunServicePayloadInput,
  streaming: boolean,
) {
  return {
    prompt: withMoodlePrompt(
      input.prompt,
      input.moodleContext,
      input.messages,
      {
        allowGeneratedUI: shouldAllowGeneratedUI(input.moodleContext),
        responseMode: streaming ? "plain" : "structured",
      },
    ),
    images: input.images,
    attachmentImages: input.attachmentImages,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    outputSchema: streaming ? undefined : codexOutputSchema,
    stream: streaming,
  };
}

function shouldAllowGeneratedUI(moodleContext: unknown): boolean {
  const source = (moodleContext as { source?: unknown } | null)?.source;
  return source === "moodle-web" || source === "task-study";
}
