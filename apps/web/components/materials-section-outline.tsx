"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type MaterialsSectionOutlineItem = {
  anchorId: string;
  count: number;
  key: string;
  label: string;
};

export function sectionAnchorId(section: string): string {
  const slug = section
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `materials-${slug || "section"}`;
}

export function MaterialsSectionOutline({
  scrollSelector,
  sections,
}: {
  scrollSelector: string;
  sections: MaterialsSectionOutlineItem[];
}) {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(sections[0]?.anchorId ?? null);

  useEffect(() => {
    const root = document.querySelector(scrollSelector);
    if (!root) {
      return;
    }

    const updateActive = () => {
      const rootTop = root.getBoundingClientRect().top;
      let current = sections[0]?.anchorId ?? null;
      for (const section of sections) {
        const element = document.getElementById(section.anchorId);
        if (!element) {
          continue;
        }
        if (element.getBoundingClientRect().top - rootTop <= 16) {
          current = section.anchorId;
        } else {
          break;
        }
      }
      setActiveAnchor(current);
    };

    updateActive();
    root.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      root.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [scrollSelector, sections]);

  useEffect(() => {
    const jumpToHash = () => {
      const anchorId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!anchorId || !sections.some((section) => section.anchorId === anchorId)) {
        return;
      }
      jumpToSection(scrollSelector, anchorId);
      setActiveAnchor(anchorId);
    };

    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    return () => window.removeEventListener("hashchange", jumpToHash);
  }, [scrollSelector, sections]);

  if (sections.length < 2) {
    return null;
  }

  return (
    <aside className="sticky top-4 hidden w-40 shrink-0 self-start lg:block">
      <nav aria-label="Material-Kapitel" className="flex flex-col border-l border-border/40 pl-3">
        {sections.map((section) => {
          const isActive = section.anchorId === activeAnchor;
          return (
            <a
              className={cn(
                "group relative block py-1.5 text-xs leading-snug transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground",
              )}
              href={`#${encodeURIComponent(section.anchorId)}`}
              key={section.key}
              onClick={(event) => {
                event.preventDefault();
                window.history.pushState(null, "", `#${encodeURIComponent(section.anchorId)}`);
                jumpToSection(scrollSelector, section.anchorId);
                setActiveAnchor(section.anchorId);
              }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[13px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/25 transition-colors",
                  isActive ? "bg-foreground" : "group-hover:bg-foreground/50",
                )}
              />
              <span className={cn("block truncate", isActive && "font-medium")}>
                {section.label}
                {isActive ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">/{section.count}</span> : null}
              </span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function jumpToSection(scrollSelector: string, anchorId: string) {
  const root = document.querySelector(scrollSelector);
  const element = document.getElementById(anchorId);
  if (!root || !element) {
    return;
  }
  const offset = element.getBoundingClientRect().top - root.getBoundingClientRect().top;
  root.scrollTo({ top: root.scrollTop + offset - 4, behavior: "smooth" });
}
