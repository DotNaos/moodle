"use client";

import { FileIcon } from "@dotnaos/react-ui/web";
import { ExternalLink, FileArchive, FileText, Globe, ImageIcon } from "lucide-react";
import { useState } from "react";

import type { Course, Material } from "@/lib/dashboard-data";
import { courseImageUrl, courseTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function LoadingRows({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Spinner aria-hidden />
        {label}
      </div>
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center px-6 text-center">
      <div>
        <FileText className="mx-auto mb-3 text-muted-foreground" aria-hidden />
        <p className="font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function CourseThumbnail({
  course,
  active = false,
  size = "default",
}: {
  course: Course;
  active?: boolean;
  size?: "compact" | "default" | "large";
}) {
  const imageUrl = courseImageUrl(course);
  const [failed, setFailed] = useState(false);
  const dimensions = size === "large" ? "h-16 w-24" : size === "compact" ? "h-9 w-12" : "h-14 w-16";
  const radius = size === "compact" ? "rounded-xl" : "rounded-2xl";

  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden bg-secondary",
        radius,
        dimensions,
        active && "bg-primary-foreground/15",
      )}
    >
      {imageUrl && !failed ? (
        <img
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon aria-hidden />
        </span>
      )}
    </span>
  );
}

export function CourseSidebarRow({
  active = false,
  course,
  onSelect,
}: {
  active?: boolean;
  course: Course;
  onSelect: () => void;
}) {
  const imageUrl = courseImageUrl(course);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <button
      className={cn(
        "group flex min-h-11 w-full items-stretch gap-2 overflow-hidden rounded-lg pr-2 text-left transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary/80",
      )}
      type="button"
      onClick={onSelect}
    >
      <span className="flex min-w-0 flex-1 items-center py-2.5 pl-3">
        <span className="block truncate text-sm font-medium leading-snug">{courseTitle(course)}</span>
      </span>
      {showImage && imageUrl ? (
        <span className="relative h-11 w-14 shrink-0 overflow-hidden">
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={imageUrl}
            onError={() => setImageFailed(true)}
          />
          {active ? <span aria-hidden className="absolute inset-0 bg-primary/35" /> : null}
        </span>
      ) : null}
    </button>
  );
}

export function CourseGridCard({
  active = false,
  course,
  onSelect,
}: {
  active?: boolean;
  course: Course;
  onSelect: () => void;
}) {
  const imageUrl = courseImageUrl(course);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <button
      className={cn(
        "flex w-44 flex-col overflow-hidden rounded-2xl text-left transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary/60 hover:bg-secondary",
      )}
      type="button"
      onClick={onSelect}
    >
      <span className="relative h-24 w-full bg-secondary">
        {showImage && imageUrl ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={imageUrl}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon aria-hidden />
          </span>
        )}
        {active ? <span aria-hidden className="absolute inset-0 bg-primary/35" /> : null}
      </span>
      <span className="line-clamp-2 px-3 py-2.5 text-sm font-medium leading-snug">{courseTitle(course)}</span>
    </button>
  );
}

export function MaterialGridCard({
  active = false,
  material,
  onSelect,
}: {
  active?: boolean;
  material: Material;
  onSelect: () => void;
}) {
  const hasExtension = /\.[a-z0-9]{2,4}$/i.test(material.name);
  const isFile = Boolean(material.fileType) || hasExtension;
  const isZip = material.fileType?.toLowerCase() === "zip" || /\.zip$/i.test(material.name);
  const filename = material.fileType ? `${material.name}.${material.fileType}` : material.name;

  return (
    <div
      className={cn(
        "group relative flex h-full w-36 flex-col gap-2 rounded-2xl p-3 transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary/60 hover:bg-secondary",
      )}
    >
      <button className="flex flex-col items-start gap-2 text-left" type="button" onClick={onSelect}>
        {!isFile ? (
          <Globe className="shrink-0 text-muted-foreground" size={28} />
        ) : isZip ? (
          <FileArchive className="shrink-0 text-muted-foreground" size={28} />
        ) : (
          <FileIcon className="shrink-0" filename={filename} size={28} />
        )}
        <span className="line-clamp-2 text-sm font-medium leading-snug break-words">{material.name}</span>
      </button>
      {material.url ? (
        <a
          aria-label={`Open ${material.name} in Moodle`}
          className={cn(
            "absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-background hover:text-foreground focus-within:opacity-100 group-hover:opacity-100",
            active && "text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground",
          )}
          href={material.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

export function MaterialRow({
  active = false,
  material,
  onSelect,
}: {
  active?: boolean;
  material: Material;
  onSelect: () => void;
}) {

  const hasExtension = /\.[a-z0-9]{2,4}$/i.test(material.name);
  const isFile = Boolean(material.fileType) || hasExtension;
  const isZip = material.fileType?.toLowerCase() === "zip" || /\.zip$/i.test(material.name);
  const filename = material.fileType ? `${material.name}.${material.fileType}` : material.name;

  return (
    <div
      className={cn(
        "group flex min-h-14 w-full min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary hover:text-secondary-foreground",
      )}
    >
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" onClick={onSelect}>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary",
            active && "bg-primary-foreground/15",
          )}
        >
          {!isFile ? (
            <Globe className="text-muted-foreground" size={20} />
          ) : isZip ? (
            <FileArchive className="text-muted-foreground" size={20} />
          ) : (
            <FileIcon filename={filename} size={20} />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{material.name}</span>
        </span>
      </button>
      {material.url ? (
        <a
          aria-label={`Open ${material.name} in Moodle`}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-background hover:text-foreground focus-within:opacity-100 group-hover:opacity-100",
            active && "text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground",
          )}
          href={material.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
