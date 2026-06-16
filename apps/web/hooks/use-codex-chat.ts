"use client";

import { useState } from "react";

import type { CodexActionResult } from "@/hooks/use-codex-moodle-actions";
import type { MoodleUIAction } from "@/lib/codex-actions";
import {
  buildActionFollowUpMessage,
  buildAttachmentPrompt,
  buildMoodleContext,
  completeCodexActions,
  describeAppliedActions,
  displayCodexText,
  isCodexLifecycleNoise,
  mergeLoadedResources,
  shouldContinueAfterActions,
  toChatHistory,
  type CodexChatUIMessage,
  type CodexToolStatus,
  type LoadedResourceContext,
  type StudyChatContext,
} from "@/lib/codex-chat";
import type { CodexAttachment } from "@/lib/codex-files";
import { runCodexStream } from "@/lib/codex-stream-client";
import type { Course, Material, User } from "@/lib/dashboard-data";
import { buildPDFImageInputs, type PDFViewState } from "@/lib/pdf-context";

const MAX_CODEX_ACTION_TURNS = 8;

type UseCodexChatInput = {
  user: User | null;
  courses: Course[];
  selectedCourse: Course | null;
  materials: Material[];
  selectedMaterial: Material | null;
  pdfState: PDFViewState | null;
  studyContext?: StudyChatContext;
  model?: string;
  reasoningEffort?: string;
  onApplyActions: (actions: MoodleUIAction[]) => Promise<CodexActionResult>;
};

export function useCodexChat({
  user,
  courses,
  selectedCourse,
  materials,
  selectedMaterial,
  pdfState,
  studyContext,
  model,
  reasoningEffort,
  onApplyActions,
}: UseCodexChatInput) {
  const [messages, setMessages] = useState<CodexChatUIMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAssistantMessage(messageId: string, text: string) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, text } : message)),
    );
  }

  function appendAssistantMessage(messageId: string, delta: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: message.text === "Thinking..." ? delta : `${message.text}${delta}`,
            }
          : message,
      ),
    );
  }

  function recordToolEvent(messageId: string, title: string, status: CodexToolStatus, sourceId?: string) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) {
          return message;
        }
        const toolEvents = [...message.toolEvents];
        // Correlate updates to an existing row: prefer the backend id; with no
        // id (legacy), a "running" event always starts a new row while a
        // terminal one updates the most recent still-running row of that title.
        const matchIndex =
          sourceId !== undefined
            ? toolEvents.findIndex((event) => event.sourceId === sourceId)
            : status === "running"
              ? -1
              : lastRunningIndexByTitle(toolEvents, title);
        if (matchIndex >= 0) {
          toolEvents[matchIndex] = { ...toolEvents[matchIndex], title, status };
          return { ...message, toolEvents };
        }
        toolEvents.push({ id: crypto.randomUUID(), sourceId, title, status });
        return { ...message, toolEvents };
      }),
    );
  }

  function appendAssistantActions(messageId: string, actions: CodexChatUIMessage["actions"]) {
    if (actions.length === 0) {
      return;
    }
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, actions: [...message.actions, ...actions] } : message,
      ),
    );
  }

  async function submit(rawText: string, attachments: CodexAttachment[] = []) {
    const text = rawText.trim();
    if ((!text && attachments.length === 0) || running) {
      return;
    }
    const backendPrompt = buildAttachmentPrompt(text, attachments);
    // Image attachments are passed by basename so the backend can attach them
    // to `codex exec -i` (vision over the uploaded file).
    const attachmentImages = attachments
      .filter((attachment) => attachment.kind === "image")
      .map((attachment) => attachment.name);

    const userMessage: CodexChatUIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      toolEvents: [],
      actions: [],
      attachments,
    };
    const assistantMessageId = crypto.randomUUID();
    let chatHistory = toChatHistory([...messages, userMessage]);
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: "assistant", text: "Thinking...", toolEvents: [], actions: [], attachments: [] },
    ]);
    setRunning(true);
    setError(null);

    try {
      let loadedResources: LoadedResourceContext = [];
      let reachedActionLimit = false;

      for (let turn = 0; turn < MAX_CODEX_ACTION_TURNS; turn += 1) {
        const result = await runCodexStream(
          {
            prompt: backendPrompt,
            images: buildPDFImageInputs(pdfState),
            attachmentImages,
            messages: chatHistory,
            model: model || undefined,
            reasoningEffort: reasoningEffort || undefined,
            stream: true,
            moodleContext: buildMoodleContext({
              user,
              courses,
              selectedCourse,
              materials,
              selectedMaterial,
              pdfState,
              studyContext,
              loadedResources,
            }),
          },
          (event) => {
            if (event.type === "message") {
              updateAssistantMessage(assistantMessageId, displayCodexText(event.text));
            } else if (event.type === "delta") {
              appendAssistantMessage(assistantMessageId, displayCodexText(event.text));
            } else if (event.type === "tool" && !isCodexLifecycleNoise(event.title)) {
              recordToolEvent(assistantMessageId, event.title, event.status, event.id);
            }
            // "status" events — and lifecycle noise mislabeled as "tool" by older
            // backends — are intentionally ignored (hidden in UI).
          },
        );

        const actions = completeCodexActions(result.actions, text);
        updateAssistantMessage(assistantMessageId, result.finalResponse);

        if (actions.length === 0) {
          break;
        }

        const actionResult = await onApplyActions(actions);
        loadedResources = mergeLoadedResources(loadedResources, actionResult.loadedResources);
        appendAssistantActions(
          assistantMessageId,
          describeAppliedActions(actions, actionResult.loadedResources, courses),
        );

        if (!shouldContinueAfterActions(actions, actionResult)) {
          break;
        }

        if (turn === MAX_CODEX_ACTION_TURNS - 1) {
          reachedActionLimit = true;
          break;
        }

        chatHistory = [
          ...chatHistory,
          {
            role: "assistant",
            text: buildActionFollowUpMessage(actions, actionResult.loadedResources),
          },
        ];
      }

      if (reachedActionLimit) {
        setError("Codex needed too many Moodle UI steps. Try asking for a more specific course or file.");
      }
    } catch (submitError) {
      setMessages((current) => current.filter((message) => message.id !== assistantMessageId));
      setError(submitError instanceof Error ? submitError.message : "Codex failed.");
    } finally {
      setRunning(false);
    }
  }

  return { messages, running, error, submit, setError };
}

function lastRunningIndexByTitle(toolEvents: CodexChatUIMessage["toolEvents"], title: string): number {
  for (let index = toolEvents.length - 1; index >= 0; index -= 1) {
    if (toolEvents[index].title === title && toolEvents[index].status === "running") {
      return index;
    }
  }
  return -1;
}
