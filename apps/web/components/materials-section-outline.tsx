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
    <aside className="sticky top-3 hidden w-52 shrink-0 self-start lg:block">
      <nav aria-label="Material-Kapitel" className="flex flex-col gap-1">
        {sections.map((section) => {
          const isActive = section.anchorId === activeAnchor;
          return (
            <a
              className={cn(
                "block rounded-2xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
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
              <span className={cn("block truncate", isActive && "font-semibold")}>{section.label}</span>
              {isActive ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{section.count} Materialien</span>
              ) : null}
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
