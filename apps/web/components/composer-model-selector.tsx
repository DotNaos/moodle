"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { useCodexModels } from "@/hooks/use-codex-models";
import { cn } from "@/lib/utils";

type ComposerModelSelectorProps = {
  modelsHook: ReturnType<typeof useCodexModels>;
};

type MenuPanel = "model" | "connect";

type MenuPosition = {
  bottom: number;
  maxHeight: number;
  right: number;
};

export function ComposerModelSelector({ modelsHook }: ComposerModelSelectorProps) {
  const [openPanel, setOpenPanel] = useState<MenuPanel | false>(false);
  const [reasoningFlyoutOpen, setReasoningFlyoutOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    activeModelOption,
    authChecking,
    connect,
    connected,
    connecting,
    deviceCode,
    error,
    loading,
    models,
    selectedReasoningEffort,
  } = modelsHook;
  const reasoningOptions = Array.isArray(activeModelOption?.reasoningEfforts) ? activeModelOption.reasoningEfforts : [];
  const activeReasoning = reasoningOptions.find((option) => option.id === selectedReasoningEffort);
  const busy = authChecking || loading || connecting;
  const modelPickerDisabled = busy || !connected || models.length === 0;
  const menuOpen = Boolean(openPanel);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const availableAbove = rect.top - 12;
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 8,
        right: Math.max(12, window.innerWidth - rect.right),
        maxHeight: Math.max(180, Math.min(420, availableAbove)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, openPanel]);

  useEffect(() => {
    if (!menuOpen) {
      setReasoningFlyoutOpen(false);
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      const portalMenu = document.getElementById("composer-model-menu");
      if (portalMenu?.contains(target)) {
        return;
      }
      setOpenPanel(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPanel(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (deviceCode) {
      setOpenPanel("connect");
    }
  }, [deviceCode]);

  useEffect(() => {
    if (error && !connected) {
      setErrorDialogOpen(true);
    }
  }, [connected, error]);

  async function copyDeviceCode() {
    if (!deviceCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(deviceCode.userCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      modelsHook.setError("Der Anmeldecode konnte nicht kopiert werden.");
    }
  }

  async function copyErrorMessage() {
    if (!error) {
      return;
    }
    try {
      await navigator.clipboard.writeText(error);
      setCopiedError(true);
      window.setTimeout(() => setCopiedError(false), 1800);
    } catch {
      modelsHook.setError("Die Fehlermeldung konnte nicht kopiert werden.");
    }
  }

  const statusLabel = busy
    ? connecting
      ? "Verbinden…"
      : "Laden…"
    : !connected
      ? "Verbinden"
      : models.length === 0
        ? "Kein Modell"
        : null;

  const menu =
    menuOpen && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[80] flex items-end gap-1.5"
            id="composer-model-menu"
            style={{
              bottom: menuPosition.bottom,
              maxHeight: menuPosition.maxHeight,
              right: menuPosition.right,
            }}
            onMouseLeave={() => setReasoningFlyoutOpen(false)}
          >
            {openPanel === "model" && reasoningFlyoutOpen && reasoningOptions.length > 0 ? (
              <div
                className="flex w-56 shrink-0 flex-col rounded-[1.5rem] bg-popover p-2 text-popover-foreground shadow-xl"
                onMouseEnter={() => setReasoningFlyoutOpen(true)}
              >
                <MenuSectionLabel>Reasoning</MenuSectionLabel>
                {reasoningOptions.map((option) => (
                  <button
                    key={option.id}
                    className="flex w-full items-center justify-between gap-2 rounded-[1rem] px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    type="button"
                    onClick={() => {
                      modelsHook.setSelectedReasoningEffort(option.id);
                    }}
                  >
                    <span>{option.label}</span>
                    {option.id === selectedReasoningEffort ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className="flex w-64 shrink-0 flex-col rounded-[1.5rem] bg-popover text-popover-foreground shadow-xl"
              style={{ maxHeight: menuPosition.maxHeight }}
            >
              {openPanel === "connect" && deviceCode ? (
                <div className="p-3 text-sm">
                  <p className="font-medium text-foreground">ChatGPT anmelden</p>
                  <p className="mt-1 text-xs text-muted-foreground">Code auf der Login-Seite eingeben:</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="inline-flex rounded-full bg-secondary px-3 py-1.5 font-mono text-base font-semibold tracking-wide text-foreground">
                      {deviceCode.userCode}
                    </p>
                    <button
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
                      type="button"
                      onClick={() => void copyDeviceCode()}
                    >
                      {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiedCode ? "Kopiert" : "Kopieren"}
                    </button>
                  </div>
                  <a
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    href={deviceCode.verificationUri}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-3.5" />
                    Login öffnen
                  </a>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    <MenuSectionLabel>Model</MenuSectionLabel>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                        type="button"
                        onClick={() => {
                          modelsHook.setSelectedModel(model.id);
                        }}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          {model.id === activeModelOption?.id ? <Check className="size-3" /> : null}
                        </span>
                        <span className="truncate">{model.label}</span>
                      </button>
                    ))}
                    {error ? (
                      <button
                        className="mt-1 rounded-[1rem] px-3 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
                        type="button"
                        onClick={() => setErrorDialogOpen(true)}
                      >
                        Fehler anzeigen
                      </button>
                    ) : null}
                  </div>
                  {reasoningOptions.length > 0 ? (
                    <div
                      className="shrink-0 border-t border-border/60 p-2"
                      onMouseEnter={() => setReasoningFlyoutOpen(true)}
                    >
                      <div
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-[1rem] px-3 py-2.5 text-sm transition-colors",
                          reasoningFlyoutOpen ? "bg-secondary" : "hover:bg-secondary",
                        )}
                      >
                        <span className="font-medium text-foreground">Reasoning</span>
                        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                          <span className="truncate">{activeReasoning?.label ?? "Default"}</span>
                          <ChevronRight className="size-3.5 shrink-0" />
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative flex items-center gap-1" ref={rootRef}>
      <button
        ref={triggerRef}
        className={cn(
          "flex h-8 max-w-[12rem] items-center gap-1 rounded-full px-2 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-none",
          !connected && !busy ? "text-primary" : "",
        )}
        disabled={busy}
        type="button"
        onClick={() => {
          if (busy) {
            return;
          }
          if (!connected) {
            void connect();
            return;
          }
          setOpenPanel((current) => {
            if (current) {
              setReasoningFlyoutOpen(false);
              return false;
            }
            return "model";
          });
        }}
      >
        {busy ? <Spinner aria-hidden className="size-3.5 shrink-0" /> : null}
        {statusLabel ? (
          <span className="truncate text-sm font-semibold text-foreground">{statusLabel}</span>
        ) : (
          <span className="flex min-w-0 items-center gap-1 truncate text-sm">
            <span className="truncate font-semibold text-foreground">{activeModelOption?.label}</span>
            {activeReasoning ? (
              <span className="truncate font-normal text-muted-foreground">{activeReasoning.label}</span>
            ) : null}
          </span>
        )}
        {connected && !modelPickerDisabled ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/70" strokeWidth={2.5} />
        ) : null}
      </button>

      {error && !connected ? (
        <button
          aria-label="Fehlermeldung anzeigen"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
          type="button"
          onClick={() => setErrorDialogOpen(true)}
        >
          <AlertCircle className="size-4" />
        </button>
      ) : null}

      <ConnectErrorDialog
        copied={copiedError}
        error={error}
        open={errorDialogOpen}
        onCopy={() => void copyErrorMessage()}
        onOpenChange={setErrorDialogOpen}
      />

      {menu}
    </div>
  );
}

function MenuSectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{children}</div>
  );
}

function ConnectErrorDialog({
  copied,
  error,
  open,
  onCopy,
  onOpenChange,
}: {
  copied: boolean;
  error: string | null;
  open: boolean;
  onCopy: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!error) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verbindung fehlgeschlagen</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-auto rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-destructive">
          {error}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button className="rounded-full" type="button" variant="secondary" onClick={onCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Kopiert" : "Kopieren"}
          </Button>
          <Button className="rounded-full" type="button" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
