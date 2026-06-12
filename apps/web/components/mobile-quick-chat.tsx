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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep drawer and HUD pinned to the latest (streaming) message.
  useEffect(() => {
    const node = scrollRef.current;
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
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
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

  // HUD shows the last exchange with the user's question pinned at the bottom
  // and the streaming answer flowing down towards it from above.
  const lastUserIndex = chat.messages.findLastIndex((message) => message.role === "user");
  const lastUserMessage = lastUserIndex >= 0 ? chat.messages[lastUserIndex] : null;
  const replies = lastUserIndex >= 0 ? chat.messages.slice(lastUserIndex + 1) : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col justify-end md:hidden">
      {lastUserMessage || chat.error ? (
        <div
          ref={scrollRef}
          className="mx-3 mb-2 flex max-h-[45dvh] flex-col gap-2 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_3rem)]"
        >
          {/* Fade-out room at the top so scrolled content dissolves instead of
              cutting off hard. */}
          <div aria-hidden className="h-10 shrink-0" />
          {replies.map((message) => (
            <div
              className={cn(
                "flex w-full shrink-0 flex-col",
                message.role === "assistant" &&
                  "w-fit max-w-[92%] self-start rounded-3xl rounded-bl-lg bg-background/40 px-4 py-2.5 ring-1 ring-border/30 backdrop-blur-sm",
              )}
              key={message.id}
            >
              <ChatMessageBubble message={message} />
            </div>
          ))}
          {chat.error ? (
            <p className="w-fit shrink-0 self-start rounded-2xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive backdrop-blur-sm">
              {chat.error}
            </p>
          ) : null}
          {lastUserMessage ? (
            <div className="flex w-full shrink-0 flex-col">
              <ChatMessageBubble message={lastUserMessage} />
            </div>
          ) : null}
        </div>
      ) : null}
      {composer}
    </div>
  );
}
