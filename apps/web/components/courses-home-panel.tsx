"use client";

import { Search } from "lucide-react";

import { useState } from "react";

import { CalendarPanel } from "@/components/course-calendar-panel";
import { CourseGridCard, CourseSidebarRow, EmptyState, LoadingRows } from "@/components/dashboard-ui";
import {
  GroupedItemsLayoutToggle,
  GroupedItemsView,
  type GroupedItemsLayout,
} from "@/components/grouped-items-view";
import type { HomePanelView } from "@/lib/home-navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/lib/dashboard-data";

type CategoryOption = {
  count: number;
  key: string;
  label: string;
};

type CourseListGroup = {
  courses: Course[];
  key: string;
  label: string;
};

export function CoursesHomePanel({
  categoryOptionGroups,
  courseListGroups,
  filteredCoursesCount,
  homeView,
  loading,
  selectedCourseId,
  query,
  selectedCategory,
  onCategoryChange,
  onQueryChange,
  onSelectCourse,
}: {
  categoryOptionGroups: { other: CategoryOption[]; semesters: CategoryOption[] };
  courseListGroups: CourseListGroup[];
  filteredCoursesCount: number;
  homeView: HomePanelView;
  loading: boolean;
  selectedCourseId: string | null;
  query: string;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  const [layout, setLayout] = useState<GroupedItemsLayout>("list");

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      {homeView === "courses" ? (
        <>
          <div className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <CourseFilters
                categoryOptionGroups={categoryOptionGroups}
                query={query}
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
                onQueryChange={onQueryChange}
              />
              <GroupedItemsLayoutToggle layout={layout} onLayoutChange={setLayout} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-5">
            <div className="mx-auto w-full max-w-3xl">
              <CourseList
                courseListGroups={courseListGroups}
                filteredCoursesCount={filteredCoursesCount}
                layout={layout}
                loading={loading}
                selectedCourseId={selectedCourseId}
                onSelectCourse={onSelectCourse}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          <div className="mx-auto w-full max-w-3xl">
            <CalendarPanel compact scope="all" />
          </div>
        </div>
      )}
    </section>
  );
}

function CourseFilters({
  categoryOptionGroups,
  query,
  selectedCategory,
  onCategoryChange,
  onQueryChange,
}: {
  categoryOptionGroups: { other: CategoryOption[]; semesters: CategoryOption[] };
  query: string;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input className="pl-11" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search courses" />
      </div>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger
          aria-label="Semester filter"
          className="h-11 w-full rounded-full border-0 bg-secondary px-4 text-sm shadow-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-[10.5rem] sm:shrink-0"
        >
          <SelectValue placeholder="Alle Semester" />
        </SelectTrigger>
        <SelectContent
          className="max-h-[min(520px,var(--radix-select-content-available-height))] rounded-3xl border-0 bg-card p-2 text-card-foreground shadow-xl"
          position="popper"
          sideOffset={6}
        >
          <SelectGroup>
            <SelectItem className="rounded-2xl px-3 py-2.5" value="all">
              Alle Semester
            </SelectItem>
          </SelectGroup>
          <CategorySelectGroup label="Semesters" options={categoryOptionGroups.semesters} />
          <CategorySelectGroup label="Other Moodle categories" options={categoryOptionGroups.other} />
        </SelectContent>
      </Select>
    </div>
  );
}

function CategorySelectGroup({ label, options }: { label: string; options: CategoryOption[] }) {
  if (options.length === 0) {
    return null;
  }

  return (
    <>
      <SelectSeparator className="my-2" />
      <SelectGroup>
        <SelectLabel className="px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em]">
          {label}
        </SelectLabel>
        {options.map((category) => (
          <SelectItem key={category.key} className="rounded-2xl px-3 py-2.5" value={category.key}>
            {category.label} ({category.count})
          </SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}

function CourseList({
  courseListGroups,
  filteredCoursesCount,
  layout,
  loading,
  selectedCourseId,
  onSelectCourse,
}: {
  courseListGroups: CourseListGroup[];
  filteredCoursesCount: number;
  layout: GroupedItemsLayout;
  loading: boolean;
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
}) {
  if (loading) {
    return <LoadingRows label="Loading courses" />;
  }

  if (filteredCoursesCount === 0) {
    return <EmptyState title="No courses found" description="Try a different search." />;
  }

  return (
    <GroupedItemsView
      layout={layout}
      showLayoutToggle={false}
      stickySectionHeaders={false}
      sections={courseListGroups.map((group) => ({
        key: group.key,
        label: group.label,
        items: group.courses,
      }))}
      getItemKey={(course) => String(course.id)}
      renderGridItem={(course) => (
        <CourseGridCard
          active={String(course.id) === selectedCourseId}
          course={course}
          onSelect={() => onSelectCourse(String(course.id))}
        />
      )}
      renderListItem={(course) => (
        <CourseSidebarRow
          active={String(course.id) === selectedCourseId}
          course={course}
          onSelect={() => onSelectCourse(String(course.id))}
        />
      )}
    />
  );
}
