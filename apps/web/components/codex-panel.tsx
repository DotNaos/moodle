"use client";

import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CodexActionResult } from "@/hooks/use-codex-moodle-actions";
import type { MoodleUIAction } from "@/lib/codex-actions";
import {
  deleteCodexAuth,
  getCodexAuthStatus,
  runCodexConnectFlow,
  type CodexDeviceCode,
} from "@/lib/codex-auth-client";
import {
  buildActionFollowUpMessage,
  buildMoodleContext,
  completeCodexActions,
  displayCodexText,
  mergeLoadedResources,
  shouldContinueAfterActions,
  toChatHistory,
  type LoadedResourceContext,
} from "@/lib/codex-chat";
import { readCodexStream } from "@/lib/codex-stream-client";
import type { Course, Material, User } from "@/lib/dashboard-data";
import { courseTitle } from "@/lib/dashboard-data";
import { buildPDFImageInputs, type PDFViewState } from "@/lib/pdf-context";
import { cn } from "@/lib/utils";

type CodexPanelProps = {
  user: User | null;
  courses: Course[];
  selectedCourse: Course | null;
  materials: Material[];
  selectedMaterial: Material | null;
  onApplyActions: (actions: MoodleUIAction[]) => Promise<CodexActionResult>;
  pdfState: PDFViewState | null;
};

type CodexMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type CodexResponse = {
  threadId?: string | null;
  finalResponse?: string;
  actions?: MoodleUIAction[];
  error?: string;
};

type CodexAuthStatus = "checking" | "missing" | "connecting" | "connected";

const MAX_CODEX_ACTION_TURNS = 8;

export function CodexPanel({
  user,
  courses,
  selectedCourse,
  materials,
  selectedMaterial,
  onApplyActions,
  pdfState,
}: CodexPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<CodexMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [authStatus, setAuthStatus] = useState<CodexAuthStatus>("checking");
  const [deviceCode, setDeviceCode] = useState<CodexDeviceCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const authMenuRef = useRef<HTMLDivElement | null>(null);

  const contextSummary = useMemo(() => {
    if (selectedMaterial) {
      return selectedMaterial.name;
    }

    if (selectedCourse) {
      return courseTitle(selectedCourse);
    }

    return `${courses.length} courses`;
  }, [courses.length, selectedCourse, selectedMaterial]);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const payload = await getCodexAuthStatus();

        if (cancelled) {
          return;
        }

        setAuthStatus(payload.authenticated ? "connected" : "missing");
        if (!payload.ok) {
          setError(payload.error ?? "Could not check Codex authentication.");
        }
      } catch (authError) {
        if (cancelled) {
          return;
        }
        setAuthStatus("missing");
        setError(authError instanceof Error ? authError.message : "Could not check Codex authentication.");
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authMenuOpen) {
      return;
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setAuthMenuOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAuthMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [authMenuOpen]);

  async function connectCodex({ force = false }: { force?: boolean } = {}) {
    if (authStatus === "checking" || authStatus === "connecting" || (!force && authStatus === "connected")) {
      return;
    }

    setAuthStatus("connecting");
    setAuthMenuOpen(false);
    setDeviceCode(null);
    setCopiedCode(false);
    setError(null);

    try {
      const connected = await runCodexConnectFlow({
        onDeviceCode: (code) => {
          setDeviceCode(code);
          setCopiedCode(false);
        },
      });
      if (connected) {
        setDeviceCode(null);
        setCopiedCode(false);
        setAuthStatus("connected");
      } else {
        throw new Error("ChatGPT sign-in did not finish.");
      }
    } catch (authError) {
      setAuthStatus("missing");
      setError(authError instanceof Error ? authError.message : "Could not connect ChatGPT.");
    }
  }

  async function disconnectCodex({ reconnect = false }: { reconnect?: boolean } = {}) {
    if (authStatus === "checking" || authStatus === "connecting") {
      return;
    }

    setAuthStatus("checking");
    setAuthMenuOpen(false);
    setDeviceCode(null);
    setCopiedCode(false);
    setError(null);

    try {
      const payload = await deleteCodexAuth();
      if (!payload.ok) {
        throw new Error(payload.error ?? "Could not sign out of ChatGPT.");
      }
      setMessages([]);
      setAuthStatus("missing");
      if (reconnect) {
        await connectCodex({ force: true });
      }
    } catch (disconnectError) {
      setAuthStatus("connected");
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not sign out of ChatGPT.");
    }
  }

  async function copyDeviceCode() {
    if (!deviceCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(deviceCode.userCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setError("Could not copy the ChatGPT sign-in code.");
    }
  }

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = prompt.trim();
    if (!text || running) {
      return;
    }

    if (authStatus !== "connected") {
      setError("Connect ChatGPT before asking Codex questions.");
      return;
    }

    const userMessage: CodexMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    const assistantMessageId = crypto.randomUUID();
    let chatHistory = toChatHistory([...messages, userMessage]);
    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        text: "Thinking...",
      },
    ]);
    setPrompt("");
    setRunning(true);
    setError(null);

    try {
      let loadedResources: LoadedResourceContext = [];
      let reachedActionLimit = false;

      for (let turn = 0; turn < MAX_CODEX_ACTION_TURNS; turn += 1) {
        const response = await fetch("/api/codex/run", {
          method: "POST",
          headers: {
            accept: "application/x-ndjson",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            prompt: text,
            images: buildPDFImageInputs(pdfState),
            messages: chatHistory,
            stream: true,
            moodleContext: buildMoodleContext({
              user,
              courses,
              selectedCourse,
              materials,
              selectedMaterial,
              pdfState,
              loadedResources,
            }),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as CodexResponse;
          throw new Error(payload.error ?? `Codex failed with ${response.status}.`);
        }

        const result = await readCodexStream(response, (event) => {
          if (event.type === "message") {
            updateAssistantMessage(assistantMessageId, displayCodexText(event.text));
          } else if (event.type === "tool") {
            updateAssistantMessage(
              assistantMessageId,
              event.status === "running" ? `Working: ${event.title}` : "Finishing...",
            );
          }
        });

        const actions = completeCodexActions(result.actions, text);
        updateAssistantMessage(assistantMessageId, result.finalResponse);

        if (actions.length === 0) {
          break;
        }

        const actionResult = await onApplyActions(actions);
        loadedResources = mergeLoadedResources(loadedResources, actionResult.loadedResources);

        if (!shouldContinueAfterActions(actions, actionResult)) {
          break;
        }

        if (turn === MAX_CODEX_ACTION_TURNS - 1) {
          reachedActionLimit = true;
          break;
        }

        updateAssistantMessage(assistantMessageId, "Loaded Moodle resources. Continuing...");
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

  const isCodexConnected = authStatus === "connected";
  const connectLabel =
    authStatus === "checking"
      ? "Checking..."
      : authStatus === "connecting"
        ? "Waiting..."
        : isCodexConnected
          ? "Connected"
          : "Connect ChatGPT";
  const composerDisabled = running || !isCodexConnected;

  function updateAssistantMessage(messageId: string, text: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text,
            }
          : message,
      ),
    );
  }

  return (
    <aside className="flex min-h-[60dvh] flex-col overflow-visible rounded-2xl bg-card md:h-full md:min-h-0 md:overflow-hidden md:rounded-none md:border-l md:border-border md:bg-background">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between md:px-4 md:py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot aria-hidden className="size-4 text-muted-foreground" />
            <h2 className="truncate text-base font-semibold tracking-tight">Codex</h2>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{contextSummary}</p>
        </div>
        <div ref={authMenuRef} className="relative shrink-0">
          <Button
            aria-expanded={authMenuOpen}
            className="h-9 shrink-0 px-3 text-xs"
            disabled={authStatus === "checking" || authStatus === "connecting"}
            onClick={() => {
              if (isCodexConnected) {
                setAuthMenuOpen((open) => !open);
              } else {
                void connectCodex();
              }
            }}
            type="button"
            variant={isCodexConnected ? "secondary" : "default"}
          >
            <ShieldCheck aria-hidden className="size-3.5" />
            {connectLabel}
            {isCodexConnected ? <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", authMenuOpen ? "rotate-180" : "")} /> : null}
          </Button>
          {authMenuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[1.5rem] bg-popover p-2 text-sm text-popover-foreground shadow-2xl">
              <button
                className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-left transition-colors hover:bg-secondary"
                onClick={() => void disconnectCodex({ reconnect: true })}
                type="button"
              >
                <RotateCcw aria-hidden className="size-4" />
                Reconnect ChatGPT
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-left transition-colors hover:bg-secondary"
                onClick={() => void disconnectCodex()}
                type="button"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-visible px-4 pb-4 md:overflow-auto md:px-4 md:pb-4">
        {deviceCode ? (
          <div className="mb-3 rounded-[1.5rem] bg-secondary px-4 py-4 text-sm">
            <p className="font-medium text-foreground">Finish ChatGPT sign-in</p>
            <p className="mt-2 text-muted-foreground">
              Open the Codex login page and enter this code:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="inline-flex rounded-full bg-background px-3 py-1.5 font-mono text-lg font-semibold tracking-wide text-foreground">
                {deviceCode.userCode}
              </p>
              <Button
                className="h-9 px-3 text-xs"
                onClick={() => void copyDeviceCode()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {copiedCode ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copiedCode ? "Copied" : "Copy code"}
              </Button>
            </div>
            <Button asChild className="mt-3 h-9 px-3 text-xs" size="sm">
              <a href={deviceCode.verificationUri} rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden />
                Open ChatGPT login
              </a>
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="flex h-full min-h-60 flex-col justify-center rounded-[1.5rem] bg-secondary px-4 py-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Ask about your Moodle workspace.</p>
            <p className="mt-2">
              Codex receives the selected course and visible materials, without raw Moodle links or tokens.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-[1.5rem] px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            ))}
            {running ? (
              <div className="flex items-center gap-2 rounded-[1.5rem] bg-secondary px-4 py-3 text-sm text-muted-foreground">
                <Spinner aria-hidden />
                Thinking
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form className="flex flex-col gap-3 px-4 pb-4" onSubmit={submitPrompt}>
        {error ? (
          <div className="rounded-[1.25rem] bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <textarea
          className="min-h-28 w-full resize-none rounded-[1.5rem] bg-secondary px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={composerDisabled}
          placeholder={isCodexConnected ? "Ask about this course..." : "Connect ChatGPT before asking..."}
        />
        <Button disabled={composerDisabled || prompt.trim().length === 0} type="submit">
          {running ? <Spinner aria-hidden /> : <SendHorizontal aria-hidden />}
          Ask Codex
        </Button>
      </form>
    </aside>
  );
}
