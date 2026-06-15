"use client";

import { MessagesSquare, Search, SquarePen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatChatTime } from "@/components/navigator-panels";
import { readRecentChats, type RecentChatEntry } from "@/lib/recent-chat-storage";
import { cn } from "@/lib/utils";

type ChatHistoryModalProps = {
  activeSessionId: string | null;
  open: boolean;
  onNewChat: () => void;
  onOpenChange: (open: boolean) => void;
  onOpenSession: (session: RecentChatEntry) => void;
};

export function ChatHistoryModal({
  activeSessionId,
  open,
  onNewChat,
  onOpenChange,
  onOpenSession,
}: ChatHistoryModalProps) {
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<RecentChatEntry[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setSessions(readRecentChats());
  }, [open]);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return sessions;
    }
    return sessions.filter((session) =>
      [session.title, session.preview, session.courseTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, sessions]);

  function startNewChat() {
    onOpenChange(false);
    onNewChat();
  }

  function openSession(session: RecentChatEntry) {
    onOpenChange(false);
    onOpenSession(session);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-2xl">
        <DialogHeader className="px-4 py-4 pr-12">
          <DialogTitle>Chats suchen</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              className="pl-10"
              placeholder="Chat suchen..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button className="rounded-full" type="button" onClick={startNewChat}>
            <SquarePen aria-hidden className="size-4" />
            Neuer Chat
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filteredSessions.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {filteredSessions.map((session) => {
                const active = activeSessionId === session.id;
                return (
                  <li key={session.id}>
                    <button
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                      )}
                      type="button"
                      onClick={() => openSession(session)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                          active ? "bg-primary-foreground/15" : "bg-secondary",
                        )}
                      >
                        <MessagesSquare aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{session.title}</span>
                        <span className={cn("mt-1 block line-clamp-2 text-xs leading-4", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          {session.preview}
                        </span>
                        <span className={cn("mt-1 block truncate text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          {session.courseTitle ? `${session.courseTitle} · ` : ""}
                          {formatChatTime(session.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {sessions.length === 0 ? "Noch keine Chats." : "Keine Chats gefunden."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
