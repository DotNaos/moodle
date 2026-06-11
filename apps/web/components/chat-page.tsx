"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  GraduationCap,
  ImageIcon,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { LucideIcon } from "lucide-react";

import { ChatCoursePickerModal } from "@/components/chat-course-picker-modal";
import { ComposerModelSelector } from "@/components/composer-model-selector";
import { CourseResourcePickerModal } from "@/components/course-resource-picker-modal";
import { CourseThumbnail } from "@/components/dashboard-ui";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Spinner } from "@/components/ui/spinner";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { WorkspaceFilePanel } from "@/components/workspace-file-panel";
import { useCodexChat } from "@/hooks/use-codex-chat";
import { useCodexModels } from "@/hooks/use-codex-models";
import { useUserSettings } from "@/hooks/use-user-settings";
import type { CodexActionResult } from "@/hooks/use-codex-moodle-actions";
import type { MoodleUIAction } from "@/lib/codex-actions";
import type { CodexAppliedAction, CodexChatUIMessage, CodexToolEvent } from "@/lib/codex-chat";
import {
  formatFileSize,
  resourceAttachment,
  uploadWorkspaceFile,
  type CodexAttachment,
} from "@/lib/codex-files";
import type { Course, Material, User } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import type { PDFViewState } from "@/lib/pdf-context";
import { cn } from "@/lib/utils";

type ChatPageProps = {
  user: User | null;
  courses: Course[];
  materials: Material[];
  selectedMaterial: Material | null;
  selectedCourseId: string | null;
  pdfState: PDFViewState | null;
  loadMaterials: (courseId: string) => Promise<Material[]>;
  onCourseChange: (courseId: string) => void;
  onApplyActions: (actions: MoodleUIAction[]) => Promise<CodexActionResult>;
  // "page" = full chat view; "sidebar" = compact right-hand panel.
  variant?: "page" | "sidebar";
  onClose?: () => void;
};

type PendingFile = { kind: "file"; id: string; file: File; previewUrl?: string };
type PendingResource = { kind: "resource"; id: string; courseId: string; materialId: string; name: string };
type PendingItem = PendingFile | PendingResource;

export function ChatPage({
  user,
  courses,
  materials,
  selectedMaterial,
  selectedCourseId,
  pdfState,
  loadMaterials,
  onCourseChange,
  onApplyActions,
  variant = "page",
  onClose,
}: ChatPageProps) {
  const isSidebar = variant === "sidebar";
  const [prompt, setPrompt] = useState("");
  const modelsHook = useCodexModels(selectedCourseId ?? undefined);
  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId) ?? null;

  const chat = useCodexChat({
    user,
    courses,
    selectedCourse,
    materials,
    selectedMaterial,
    pdfState,
    model: modelsHook.selectedModel,
    reasoningEffort: modelsHook.selectedReasoningEffort,
    onApplyActions,
  });

  const hasMessages = chat.messages.length > 0;

  // Refresh the workspace file panel whenever a Codex run finishes (files may
  // have changed).
  const [filesReloadKey, setFilesReloadKey] = useState(0);
  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (prevRunningRef.current && !chat.running) {
      setFilesReloadKey((current) => current + 1);
    }
    prevRunningRef.current = chat.running;
  }, [chat.running]);

  // Persisted, DB-backed user settings: remember the chat course, model and
  // reasoning effort across sessions so they don't reset every time.
  const { settings, loaded: settingsLoaded, update: updateSettings } = useUserSettings();
  const courseAppliedRef = useRef(false);
  const modelAppliedRef = useRef(false);

  const handleCourseChange = useCallback(
    (courseId: string) => {
      onCourseChange(courseId);
      updateSettings({ chatCourseId: courseId });
    },
    [onCourseChange, updateSettings],
  );

  // Restore the saved course once, only if nothing is selected yet. Only the
  // full page does this — the sidebar adopts whatever course the user is on and
  // must not hijack dashboard navigation.
  useEffect(() => {
    if (isSidebar || !settingsLoaded || courseAppliedRef.current) {
      return;
    }
    courseAppliedRef.current = true;
    if (!selectedCourseId && settings.chatCourseId) {
      onCourseChange(settings.chatCourseId);
    }
  }, [isSidebar, settingsLoaded, settings.chatCourseId, selectedCourseId, onCourseChange]);

  // Restore the saved model/reasoning once the catalog is available.
  const { connected: modelsConnected, models, setSelectedModel, setSelectedReasoningEffort } = modelsHook;
  useEffect(() => {
    if (!settingsLoaded || modelAppliedRef.current || !modelsConnected || models.length === 0) {
      return;
    }
    modelAppliedRef.current = true;
    if (settings.chatModel && models.some((model) => model.id === settings.chatModel)) {
      setSelectedModel(settings.chatModel);
      if (settings.chatReasoningEffort) {
        setSelectedReasoningEffort(settings.chatReasoningEffort);
      }
    }
  }, [
    settingsLoaded,
    settings.chatModel,
    settings.chatReasoningEffort,
    modelsConnected,
    models,
    setSelectedModel,
    setSelectedReasoningEffort,
  ]);

  // Persist model/reasoning changes (only after the saved values were applied).
  useEffect(() => {
    if (!modelAppliedRef.current || !modelsHook.selectedModel) {
      return;
    }
    updateSettings({
      chatModel: modelsHook.selectedModel,
      chatReasoningEffort: modelsHook.selectedReasoningEffort,
    });
  }, [modelsHook.selectedModel, modelsHook.selectedReasoningEffort, updateSettings]);

  const [pending, setPending] = useState<PendingItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function addFiles(files: File[]) {
    setPending((current) => [
      ...current,
      ...files.map((file): PendingFile => ({
        kind: "file",
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    ]);
  }

  function removePending(id: string) {
    setPending((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.kind === "file" && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function addResources(selected: Material[]) {
    setPending((current) => {
      const existing = new Set(current.map((item) => item.id));
      const additions = selected
        .map((material): PendingResource => ({
          kind: "resource",
          id: `resource:${material.courseId ?? selectedCourseId ?? ""}:${material.id}`,
          courseId: String(material.courseId ?? selectedCourseId ?? ""),
          materialId: material.id,
          name: material.name,
        }))
        .filter((item) => !existing.has(item.id));
      return [...current, ...additions];
    });
  }

  async function handleSend() {
    const text = prompt.trim();
    if ((!text && pending.length === 0) || chat.running || uploading) {
      return;
    }

    const attachments: CodexAttachment[] = [];
    const files = pending.filter((item): item is PendingFile => item.kind === "file");
    if (files.length > 0) {
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          files.map(async (item) => ({ ...(await uploadWorkspaceFile(item.file)), previewUrl: item.previewUrl })),
        );
        attachments.push(...uploaded);
      } catch (uploadError) {
        chat.setError(uploadError instanceof Error ? uploadError.message : "Upload fehlgeschlagen.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    for (const item of pending) {
      if (item.kind === "resource") {
        attachments.push(resourceAttachment({ id: item.materialId, name: item.name, courseId: item.courseId }));
      }
    }

    setPrompt("");
    setPending([]);
    void chat.submit(text, attachments);
  }

  const composer = (
    <ChatComposer
      courses={courses}
      loadMaterials={loadMaterials}
      modelsHook={modelsHook}
      pending={pending}
      prompt={prompt}
      running={chat.running}
      selectedCourse={selectedCourse}
      selectedCourseId={selectedCourseId}
      uploading={uploading}
      onAddFiles={addFiles}
      onAddResources={addResources}
      onCourseChange={handleCourseChange}
      onPromptChange={setPrompt}
      onRemove={removePending}
      onSend={handleSend}
    />
  );

  const contentWidth = isSidebar ? "max-w-full" : "max-w-3xl";

  // Page + no messages: big centered hero. Otherwise (and always in the
  // sidebar): a scrolling feed with the composer docked at the bottom.
  const mainContent =
    !hasMessages && !isSidebar ? (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-background px-4 py-8">
        <h1 className="mb-8 text-center text-[1.75rem] font-semibold tracking-tight sm:mb-10 sm:text-[2rem]">
          What do you want to Learn?
        </h1>
        <div className="w-full max-w-3xl">
          {chat.error ? <ChatError message={chat.error} /> : null}
          {composer}
        </div>
      </div>
    ) : (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
        <div className={cn("flex-1 overflow-auto", isSidebar ? "p-3" : "p-4 md:p-8")}>
          <div className={cn("mx-auto flex w-full flex-col gap-4", contentWidth)}>
            {chat.messages.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                Frag mich etwas zu diesem Kurs.
              </p>
            ) : (
              chat.messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
            )}
          </div>
        </div>
        <div className={cn("shrink-0", isSidebar ? "p-3" : "p-4 md:p-6")}>
          <div className={cn("mx-auto w-full", contentWidth)}>
            {chat.error ? <ChatError message={chat.error} /> : null}
            {composer}
          </div>
        </div>
      </div>
    );

  if (isSidebar) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border/50 bg-background">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2.5">
          <MessageSquare aria-hidden className="size-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Chat</h2>
          {onClose ? (
            <button
              aria-label="Chat schließen"
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              type="button"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        {mainContent}
      </aside>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
      <WorkspaceFilePanel className="hidden lg:flex" reloadKey={filesReloadKey} />
    </div>
  );
}

function ChatMessageBubble({ message }: { message: CodexChatUIMessage }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (message.role === "user") {
    return (
      <div className="flex max-w-[85%] flex-col items-end gap-1.5 self-end">
        {lightboxSrc ? <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} /> : null}
        {message.attachments.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            {message.attachments.map((attachment) =>
              attachment.kind === "image" && attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={attachment.id}
                  alt={attachment.name}
                  className="max-h-44 max-w-[13rem] cursor-zoom-in rounded-2xl object-cover transition-opacity hover:opacity-90"
                  src={attachment.previewUrl}
                  onClick={() => attachment.previewUrl && setLightboxSrc(attachment.previewUrl)}
                />
              ) : (
                <AttachmentChip
                  key={attachment.id}
                  kind={attachment.kind}
                  name={attachment.name}
                  previewUrl={attachment.previewUrl}
                  size={attachment.size}
                />
              ),
            )}
          </div>
        ) : null}
        {message.text ? (
          <div className="rounded-3xl rounded-br-lg bg-secondary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>
        ) : null}
      </div>
    );
  }

  const isPending = message.text === "Thinking...";

  return (
    <div className="flex max-w-full flex-col gap-1 self-start">
      {/* Each tool call / action renders inline in the chat flow as its own row. */}
      {message.toolEvents.map((event) => (
        <ToolEventRow key={event.id} event={event} />
      ))}
      {isPending ? (
        <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
          <ThinkingDots />
          {message.toolEvents.some((event) => event.status === "running") ? "Arbeitet" : "Denkt nach"}
        </div>
      ) : (
        <MarkdownRenderer className="text-sm leading-relaxed" text={message.text} />
      )}
      {message.actions.map((action) => (
        <ActionRow key={action.id} action={action} />
      ))}
    </div>
  );
}

function ToolEventRow({ event }: { event: CodexToolEvent }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm text-muted-foreground">
      <ToolStatusIcon status={event.status} />
      <span className="min-w-0 truncate">{event.title}</span>
    </div>
  );
}

function ToolStatusIcon({ status }: { status: CodexToolEvent["status"] }) {
  if (status === "running") {
    return <Spinner aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (status === "failed") {
    return <X aria-hidden className="size-3.5 shrink-0 text-destructive" />;
  }
  return <Check aria-hidden className="size-3.5 shrink-0 text-emerald-500" />;
}

function ActionRow({ action }: { action: CodexAppliedAction }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = action.resources.length > 0;

  return (
    <div className="flex flex-col">
      <button
        className={cn(
          "-mx-2 flex items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors",
          expandable ? "hover:bg-secondary/60" : "cursor-default",
        )}
        disabled={!expandable}
        type="button"
        onClick={() => setExpanded((current) => !current)}
      >
        <FolderOpen aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate text-foreground/90">{action.label}</span>
        {action.detail ? (
          <span className="shrink-0 text-xs text-muted-foreground">{action.detail}</span>
        ) : null}
        {expandable ? (
          <ChevronRight
            aria-hidden
            className={cn(
              "ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded ? "rotate-90" : "",
            )}
          />
        ) : null}
      </button>
      {expandable && expanded ? (
        <ul className="mt-0.5 ml-5 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {action.resources.slice(0, 8).map((resource) => (
            <li key={resource} className="truncate">
              {resource}
            </li>
          ))}
          {action.resources.length > 8 ? (
            <li className="text-muted-foreground/70">+{action.resources.length - 8} weitere</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function ChatError({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</div>
  );
}

function AttachmentChip({
  name,
  size,
  kind,
  previewUrl,
  onRemove,
}: {
  name: string;
  size?: number;
  kind: "image" | "file" | "resource";
  previewUrl?: string;
  onRemove?: () => void;
}) {
  const Icon = kind === "image" ? ImageIcon : kind === "resource" ? GraduationCap : FileText;
  const subtitle = kind === "resource" ? "Kursressource" : size && size > 0 ? formatFileSize(size) : null;
  return (
    <span className="inline-flex max-w-[14rem] items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-1.5 text-left">
      {kind === "image" && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="size-8 shrink-0 rounded-md object-cover" src={previewUrl} />
      ) : (
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium text-foreground">{name}</span>
        {subtitle ? <span className="text-[0.65rem] text-muted-foreground">{subtitle}</span> : null}
      </span>
      {onRemove ? (
        <button
          aria-label="Anhang entfernen"
          className="ml-1 flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          type="button"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function ChatComposer({
  courses,
  loadMaterials,
  modelsHook,
  pending,
  prompt,
  running,
  selectedCourse,
  selectedCourseId,
  uploading,
  onAddFiles,
  onAddResources,
  onCourseChange,
  onPromptChange,
  onRemove,
  onSend,
}: {
  courses: Course[];
  loadMaterials: (courseId: string) => Promise<Material[]>;
  modelsHook: ReturnType<typeof useCodexModels>;
  pending: PendingItem[];
  prompt: string;
  running: boolean;
  selectedCourse: Course | null;
  selectedCourseId: string | null;
  uploading: boolean;
  onAddFiles: (files: File[]) => void;
  onAddResources: (materials: Material[]) => void;
  onCourseChange: (courseId: string) => void;
  onPromptChange: (value: string) => void;
  onRemove: (id: string) => void;
  onSend: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const busy = running || uploading;
  const canSend = (prompt.trim().length > 0 || pending.length > 0) && !busy;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [prompt]);

  const addOptions: AddMenuOption[] = [
    { id: "files", label: "Dateien", icon: Paperclip, onSelect: () => filesInputRef.current?.click() },
    { id: "photos", label: "Fotos", icon: ImageIcon, onSelect: () => photosInputRef.current?.click() },
    { id: "resources", label: "Kursressourcen", icon: GraduationCap, onSelect: () => setResourceModalOpen(true) },
  ];

  return (
    <div className="flex flex-col">
      {/* Composer card */}
      <div className="relative z-10 flex min-h-[8.5rem] flex-col rounded-3xl border border-border/50 bg-background px-4 pb-3 pt-4 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
        {pending.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pending.map((item) => (
              <AttachmentChip
                key={item.id}
                kind={item.kind === "resource" ? "resource" : item.file.type.startsWith("image/") ? "image" : "file"}
                name={item.kind === "resource" ? item.name : item.file.name}
                previewUrl={item.kind === "file" ? item.previewUrl : undefined}
                size={item.kind === "file" ? item.file.size : undefined}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
        ) : null}
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
          <input
            ref={filesInputRef}
            multiple
            className="hidden"
            type="file"
            onChange={(event) => handleFileInput(event, onAddFiles)}
          />
          <input
            ref={photosInputRef}
            multiple
            accept="image/*"
            className="hidden"
            type="file"
            onChange={(event) => handleFileInput(event, onAddFiles)}
          />
          <ComposerAddMenu options={addOptions} />

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
              {busy ? <Spinner aria-hidden className="size-4" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Podest: a narrower rounded surface tucked behind the card, peeking out below
          so the course selector reads as a pedestal the composer rests on. */}
      <div className="relative z-0 mx-4 -mt-6 rounded-3xl border border-border/50 bg-secondary px-4 pb-2.5 pt-9">
        <CourseSelector
          courses={courses}
          selectedCourse={selectedCourse}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
        />
      </div>

      <CourseResourcePickerModal
        course={selectedCourse}
        loadMaterials={loadMaterials}
        open={resourceModalOpen}
        selectedIds={pending.flatMap((item) => (item.kind === "resource" ? [item.materialId] : []))}
        onConfirm={onAddResources}
        onOpenChange={setResourceModalOpen}
      />
    </div>
  );
}

function handleFileInput(event: React.ChangeEvent<HTMLInputElement>, onAddFiles: (files: File[]) => void) {
  const files = Array.from(event.target.files ?? []);
  if (files.length > 0) {
    onAddFiles(files);
  }
  event.target.value = "";
}

type AddMenuOption = { id: string; label: string; icon: LucideIcon; onSelect: () => void };

function ComposerAddMenu({ options }: { options: AddMenuOption[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        aria-label="Hinzufügen"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
          open ? "bg-secondary text-foreground" : "",
        )}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Plus className="size-5" strokeWidth={1.5} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-xl">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                type="button"
                onClick={() => {
                  setOpen(false);
                  option.onSelect();
                }}
              >
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
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
        className="inline-flex max-w-full items-center gap-2.5 py-0.5 text-left text-sm font-medium transition-colors hover:text-foreground"
        type="button"
        onClick={() => setOpen(true)}
      >
        {selectedCourse ? (
          <CourseThumbnail circle course={selectedCourse} size="compact" />
        ) : (
          <GraduationCap className="size-4 shrink-0 text-muted-foreground opacity-70" />
        )}
        <span
          className={cn(
            "min-w-0 truncate",
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

