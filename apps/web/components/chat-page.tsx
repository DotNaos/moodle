"use client";

import { ArrowUp, ChevronDown, GraduationCap, Mic, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatCoursePickerModal } from "@/components/chat-course-picker-modal";
import { ComposerModelSelector } from "@/components/composer-model-selector";
import { CourseThumbnail } from "@/components/dashboard-ui";
import { useCodexModels } from "@/hooks/use-codex-models";
import type { Course } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type ChatPageProps = {
  courses: Course[];
  selectedCourseId: string | null;
  onCourseChange: (courseId: string) => void;
};

export function ChatPage({ courses, selectedCourseId, onCourseChange }: ChatPageProps) {
  const [prompt, setPrompt] = useState("");
  const [hasMessages, setHasMessages] = useState(false);
  const modelsHook = useCodexModels(selectedCourseId ?? undefined);
  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId) ?? null;

  function handleSend() {
    if (!prompt.trim()) {
      return;
    }
    setHasMessages(true);
    setPrompt("");
  }

  if (!hasMessages) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-background px-4 py-8">
        <h1 className="mb-8 text-center text-[1.75rem] font-semibold tracking-tight sm:mb-10 sm:text-[2rem]">
          What do you want to Learn?
        </h1>
        <ChatComposer
          className="w-full max-w-3xl"
          courses={courses}
          modelsHook={modelsHook}
          prompt={prompt}
          selectedCourse={selectedCourse}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
          onPromptChange={setPrompt}
          onSend={handleSend}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">{/* Chat feed */}</div>
      </div>
      <div className="shrink-0 p-4 md:p-6">
        <ChatComposer
          className="mx-auto w-full max-w-3xl"
          courses={courses}
          modelsHook={modelsHook}
          prompt={prompt}
          selectedCourse={selectedCourse}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
          onPromptChange={setPrompt}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}

function ChatComposer({
  className,
  courses,
  modelsHook,
  prompt,
  selectedCourse,
  selectedCourseId,
  onCourseChange,
  onPromptChange,
  onSend,
}: {
  className?: string;
  courses: Course[];
  modelsHook: ReturnType<typeof useCodexModels>;
  prompt: string;
  selectedCourse: Course | null;
  selectedCourseId: string | null;
  onCourseChange: (courseId: string) => void;
  onPromptChange: (value: string) => void;
  onSend: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = prompt.trim().length > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [prompt]);

  return (
    <div
      className={cn(
        "flex min-h-[8.5rem] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4">
        <div className="relative min-h-[4.75rem] flex-1">
          {!prompt.trim() ? (
            <p className="pointer-events-none absolute inset-x-0 top-0 text-base leading-relaxed text-muted-foreground/45">
              Ask about{" "}
              <span className="italic text-muted-foreground/60">{selectedCourse ? courseTitle(selectedCourse) : "anything"}</span>
            </p>
          ) : null}
          <textarea
            ref={textareaRef}
            className="min-h-[4.75rem] w-full resize-none bg-transparent text-base leading-relaxed outline-none"
            rows={1}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            aria-label="Anhang hinzufügen"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            type="button"
          >
            <Plus className="size-5" strokeWidth={1.5} />
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <ComposerModelSelector modelsHook={modelsHook} />
            <button
              aria-label="Spracheingabe"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              type="button"
            >
              <Mic className="size-4" />
            </button>
            <button
              aria-label="Senden"
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                canSend ? "bg-neutral-500 text-white hover:bg-neutral-600" : "bg-secondary text-muted-foreground",
              )}
              disabled={!canSend}
              type="button"
              onClick={onSend}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-b-3xl border-t border-border/60 bg-secondary/55 px-4 py-2.5">
        <CourseSelector
          courses={courses}
          selectedCourse={selectedCourse}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
        />
      </div>
    </div>
  );
}

function CourseSelector({
  courses,
  selectedCourse,
  selectedCourseId,
  onCourseChange,
}: {
  courses: Course[];
  selectedCourse: Course | null;
  selectedCourseId: string | null;
  onCourseChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="inline-flex w-full max-w-full items-center gap-2.5 py-0.5 text-left text-sm font-medium transition-colors hover:text-foreground"
        type="button"
        onClick={() => setOpen(true)}
      >
        {selectedCourse ? (
          <CourseThumbnail course={selectedCourse} size="compact" />
        ) : (
          <GraduationCap className="size-4 shrink-0 text-muted-foreground opacity-70" />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selectedCourse ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selectedCourse ? courseTitle(selectedCourse) : "Kurs wählen"}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-70" />
      </button>

      <ChatCoursePickerModal
        courses={courses}
        open={open}
        selectedCourseId={selectedCourseId}
        onOpenChange={setOpen}
        onSelect={(courseId) => {
          onCourseChange(courseId);
          setOpen(false);
        }}
      />
    </>
  );
}

