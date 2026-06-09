"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { KeyRound, LogOut, Moon, RefreshCw, Sun, UserCircle } from "lucide-react";
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
