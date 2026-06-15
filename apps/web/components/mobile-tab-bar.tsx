"use client";

import { CalendarDays, House, MessagesSquare, UserCircle, type LucideIcon } from "lucide-react";

import { HeaderActionsMenu } from "@/components/header-actions-menu";
import type { User } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export type MobileTab = "home" | "chat" | "calendar";

// Shared cell styling so the profile menu trigger lines up with the real tabs.
const TAB_CELL =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-3 text-xs font-medium transition-colors";

// Spotify-style bottom navigation, mobile only. Home / Chat / Kalender are
// navigator destinations; Profil reuses the existing account menu (opens upward).
export function MobileTabBar({
  active,
  loading,
  onSelectCalendar,
  onSelectChat,
  onSelectHome,
  onRefresh,
  refreshing,
  user,
}: {
  active: MobileTab | null;
  loading: boolean;
  onSelectCalendar: () => void;
  onSelectChat: () => void;
  onSelectHome: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  user: User | null;
}) {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-border bg-background md:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
      <TabButton active={active === "home"} icon={House} label="Home" onClick={onSelectHome} />
      <TabButton active={active === "chat"} icon={MessagesSquare} label="Chat" onClick={onSelectChat} />
      <TabButton active={active === "calendar"} icon={CalendarDays} label="Kalender" onClick={onSelectCalendar} />
      <HeaderActionsMenu
        buttonClassName={cn(TAB_CELL, "h-auto rounded-none bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-foreground")}
        loading={loading}
        onRefresh={onRefresh}
        refreshing={refreshing}
        triggerContent={
          <>
            <UserCircle aria-hidden className="size-6" />
            <span>Profil</span>
          </>
        }
        user={user}
      />
    </nav>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={cn(TAB_CELL, active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden className="size-6" />
      <span>{label}</span>
    </button>
  );
}
