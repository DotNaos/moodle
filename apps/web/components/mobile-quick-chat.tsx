"use client";

import { ArrowUp, Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatMessageBubble } from "@/components/chat-page";
import { MobileSheet } from "@/components/mobile-sheet";
import { Spinner } from "@/components/ui/spinner";
import { useCodexChat } from "@/hooks/use-codex-chat";
import type { CodexActionResult } from "@/hooks/use-codex-moodle-actions";
import { useCodexModels } from "@/hooks/use-codex-models";
import type { MoodleUIAction } from "@/lib/codex-actions";
import type { StudyChatContext } from "@/lib/codex-chat";
import type { Course, Material, User } from "@/lib/dashboard-data";
import type { PDFViewState } from "@/lib/pdf-context";
import { cn } from "@/lib/utils";

// Lightweight mobile chat for quick questions about the current task: tapping
// the chat button shows just an input bar over the bottom of the screen, and
// answers appear as floating HUD bubbles. Expanding switches to a drawer with
// the full conversation; both views share one chat session. While `open` is
// false nothing renders, but the component stays mounted so the conversation
// survives closing.
export function MobileQuickChat({
  courses,
  materials,
  open,
  pdfState,
  selectedCourseId,
  selectedMaterial,
  studyContext,
  user,
  onApplyActions,
  onClose,
}: {
  courses: Course[];
  materials: Material[];
  open: boolean;
  pdfState: PDFViewState | null;
  selectedCourseId: string | null;
  selectedMaterial: Material | null;
  studyContext?: StudyChatContext;
  user: User | null;
  onApplyActions: (actions: MoodleUIAction[]) => Promise<CodexActionResult>;
  onClose: () => void;
}) {
  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId) ?? null;
  const modelsHook = useCodexModels(selectedCourseId ?? undefined);
  const chat = useCodexChat({
    user,
    courses,
    selectedCourse,
    materials,
    selectedMaterial,
    pdfState,
    studyContext,
    model: modelsHook.selectedModel,
    reasoningEffort: modelsHook.selectedReasoningEffort,
    onApplyActions,
  });

  const [prompt, setPrompt] = useState("");
  const [expanded, setExpanded] = useState(false);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the drawer pinned to the latest message.
  useEffect(() => {
    const node = drawerScrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [chat.messages, expanded]);

  function send() {
    const text = prompt.trim();
    if (!text || chat.running) {
      return;
    }
    setPrompt("");
    void chat.submit(text);
  }

  if (!open) {
    return null;
  }

  const composer = (
    <div className="flex shrink-0 items-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
      <button
        aria-label="Chat schließen"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-md ring-1 ring-border/50 backdrop-blur-md transition-colors hover:text-foreground"
        onClick={() => {
          setExpanded(false);
          onClose();
        }}
        type="button"
      >
        <X aria-hidden className="size-5" />
      </button>
      <input
        autoFocus
        className="h-11 min-w-0 flex-1 rounded-full bg-background/80 px-4 text-sm shadow-md ring-1 ring-border/50 outline-none backdrop-blur-md placeholder:text-muted-foreground"
        enterKeyHint="send"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            send();
          }
        }}
        placeholder="Kurze Frage zur Aufgabe…"
        value={prompt}
      />
      <button
        aria-label={expanded ? "Verkleinern" : "Als Drawer öffnen"}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-md ring-1 ring-border/50 backdrop-blur-md transition-colors hover:text-foreground"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? <Minimize2 aria-hidden className="size-5" /> : <Maximize2 aria-hidden className="size-5" />}
      </button>
      <button
        aria-label="Senden"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 disabled:opacity-50"
        disabled={chat.running || prompt.trim().length === 0}
        onClick={send}
        type="button"
      >
        {chat.running ? <Spinner aria-hidden className="size-5" /> : <ArrowUp aria-hidden className="size-5" />}
      </button>
    </div>
  );

  if (expanded) {
    return (
      <MobileSheet fixedHeight label="Chat" onClose={() => setExpanded(false)}>
        <div className="flex h-full flex-col">
          <div ref={drawerScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="flex flex-col gap-3 pb-3">
              {chat.messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
              {chat.error ? <p className="text-xs text-destructive">{chat.error}</p> : null}
            </div>
          </div>
          {composer}
        </div>
      </MobileSheet>
    );
  }

  const recentMessages = chat.messages.slice(-2);

  // HUD mode: no panel behind the conversation — every bubble carries its own
  // blurred background, hugging just the text.
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col justify-end md:hidden">
      {recentMessages.length > 0 || chat.error ? (
        <div className="mx-3 mb-2 flex max-h-[45dvh] flex-col gap-2 overflow-y-auto">
          {recentMessages.map((message) => (
            <div
              className={cn(
                "flex w-full shrink-0 flex-col",
                message.role === "assistant" &&
                  "w-fit max-w-[92%] self-start rounded-3xl rounded-bl-lg bg-background/80 px-4 py-2.5 shadow-md ring-1 ring-border/40 backdrop-blur-md",
              )}
              key={message.id}
            >
              <ChatMessageBubble message={message} />
            </div>
          ))}
          {chat.error ? (
            <p className="w-fit shrink-0 self-start rounded-2xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive backdrop-blur-md">
              {chat.error}
            </p>
          ) : null}
        </div>
      ) : null}
      {composer}
    </div>
  );
}
