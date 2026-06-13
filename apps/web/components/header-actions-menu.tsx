"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Bug, KeyRound, LogOut, Moon, RefreshCw, Sun, UserCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { APIKeyPanel } from "@/components/api-key-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const REPOSITORY_URL = "https://github.com/DotNaos/moodle-clients";
const NEW_ISSUE_URL = `${REPOSITORY_URL}/issues/new`;

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 19 19" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844"
      />
    </svg>
  );
}

function getClerkInitials(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) {
    return "?";
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase();
  }

  const fullName = user.fullName?.trim();
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

function MenuTriggerAvatar({ className }: { className?: string }) {
  const { user } = useUser();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = user?.hasImage ? user.imageUrl : null;
  const showImage = Boolean(imageUrl) && !imageFailed;

  if (showImage && imageUrl) {
    return (
      <img
        alt=""
        className={cn("size-10 rounded-full object-cover", className)}
        referrerPolicy="no-referrer"
        src={imageUrl}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      {getClerkInitials(user)}
    </span>
  );
}

export function HeaderActionsMenu({
  buttonClassName,
  loading,
  refreshing,
  triggerContent,
  user,
  onRefresh,
}: {
  buttonClassName?: string;
  loading: boolean;
  refreshing: boolean;
  triggerContent?: ReactNode;
  user: User | null;
  onRefresh: () => void;
}) {
  const { user: clerkUser } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { resolvedTheme, setTheme } = useTheme();
  const [apiKeyOpen, setAPIKeyOpen] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const accountTitle = clerkUser?.fullName ?? clerkUser?.firstName ?? user?.displayName ?? "Account";
  const accountSubtitle = user?.moodleSiteUrl?.replace(/^https?:\/\//, "") ?? clerkUser?.primaryEmailAddress?.emailAddress;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={
            buttonClassName ??
            "size-11 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-muted/50 aria-expanded:bg-muted/50"
          }
          type="button"
          variant="ghost"
          aria-label="Open account menu"
        >
          {triggerContent ?? <MenuTriggerAvatar />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{accountTitle}</p>
          {accountSubtitle ? <p className="truncate text-xs text-muted-foreground">{accountSubtitle}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={loading || refreshing} onSelect={() => onRefresh()}>
          {loading || refreshing ? <Spinner aria-hidden /> : <RefreshCw aria-hidden />}
          {refreshing ? "Updating…" : "Refresh"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!themeMounted}
          onSelect={() => setTheme(isDark ? "light" : "dark")}
        >
          {themeMounted && isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {themeMounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setAPIKeyOpen(true)}>
          <KeyRound aria-hidden />
          API key
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            <GitHubMark />
            GitHub repository
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={NEW_ISSUE_URL} target="_blank" rel="noreferrer">
            <Bug aria-hidden />
            Report issue
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openUserProfile()}>
          <UserCircle aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={apiKeyOpen} onOpenChange={setAPIKeyOpen}>
      <DialogContent className="gap-0 rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>API key</DialogTitle>
          <DialogDescription>
            Create a fresh key for tools outside this website. Creating one invalidates older active API keys.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <APIKeyPanel showHeader={false} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
