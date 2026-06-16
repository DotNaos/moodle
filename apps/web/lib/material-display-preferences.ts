import type { MaterialTypeFilter } from "@/lib/material-filters";

export type CourseResourcesLayout = "list" | "grid";

export const DEFAULT_COURSE_RESOURCES_LAYOUT: CourseResourcesLayout = "list";
export const DEFAULT_COURSE_RESOURCES_TYPE_FILTER: MaterialTypeFilter = "all";

export function courseResourcesLayoutFromSettings(value: unknown): CourseResourcesLayout {
  return value === "grid" || value === "list" ? value : DEFAULT_COURSE_RESOURCES_LAYOUT;
}

export function courseResourcesTypeFilterFromSettings(value: unknown): MaterialTypeFilter {
  return value === "pdf" || value === "pages" || value === "all" ? value : DEFAULT_COURSE_RESOURCES_TYPE_FILTER;
}
