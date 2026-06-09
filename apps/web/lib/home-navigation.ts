import { CalendarDays, GraduationCap, MessageSquare, type LucideIcon } from "lucide-react";

export type HomeView = "courses" | "calendar" | "chat";

export type HomePanelView = Exclude<HomeView, "chat">;

export type HomeNavItem = {
  id: HomeView;
  label: string;
  icon: LucideIcon;
};

export const HOME_NAV_ITEMS: HomeNavItem[] = [
  { id: "courses", label: "Kurse", icon: GraduationCap },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "chat", label: "Chat", icon: MessageSquare },
];
