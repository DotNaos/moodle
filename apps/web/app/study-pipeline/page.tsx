import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Circle, ExternalLink, FileText, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudyPipelineCourse, StudyPipelineResponse } from "@/lib/study-pipeline";
import { pipelineStatusLabel } from "@/lib/study-pipeline";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Study Pipeline",
  description: "Review raw, extracted, curated, and reader-ready Moodle course material.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudyPipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const servicesUrl = firstParam(params.servicesUrl) || process.env.MOODLE_SERVICES_URL || "http://127.0.0.1:8091";
  const workspace = firstParam(params.workspace) || process.env.SCHOOL_WORKSPACE || "/Users/oli/school";
  const term = firstParam(params.term) || "FS26";
  const payload = await loadPipeline({ servicesUrl, workspace, term });

  return (
    <main className="min-h-screen overflow-y-auto bg-background px-5 py-6 text-foreground lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden />
              Study pipeline
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Course material pipeline</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Live status from Moodle Services for the raw mirror, deterministic extraction, curated material, and Reader readiness.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href={currentHref({ servicesUrl, workspace, term })}>
              <RefreshCw aria-hidden />
              Refresh
            </a>
          </Button>
        </header>

        <form className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1.2fr_1.8fr_0.5fr_auto]">
          <Field label="Services URL" name="servicesUrl" defaultValue={servicesUrl} />
          <Field label="Workspace" name="workspace" defaultValue={workspace} />
          <Field label="Term" name="term" defaultValue={term} />
          <div className="flex items-end">
            <Button className="w-full" type="submit">Load</Button>
          </div>
        </form>

        {payload.ok ? (
          <>
            <Summary payload={payload.data} />
            <section className="grid gap-3">
              {payload.data.courses.map((course) => (
                <CoursePipelineRow key={`${course.term}-${course.slug}`} course={course} servicesUrl={servicesUrl} workspace={workspace} />
              ))}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" aria-hidden />
              Pipeline status could not be loaded
            </div>
            <p className="mt-2 leading-6">{payload.error}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input
        className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
        name={name}
        defaultValue={defaultValue}
      />
    </label>
  );
}

function Summary({ payload }: { payload: StudyPipelineResponse }) {
  return (
    <section className="grid gap-3 md:grid-cols-4">
      <Metric label="Courses" value={payload.summary.courses} />
      <Metric label="Complete" value={payload.summary.complete} />
      <Metric label="Needs work" value={payload.summary.partial + payload.summary.missing} />
      <Metric label="Curated files" value={payload.summary.curatedFiles} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CoursePipelineRow({
  course,
  servicesUrl,
  workspace,
}: {
  course: StudyPipelineCourse;
  servicesUrl: string;
  workspace: string;
}) {
  const passed = course.qualityGates.filter((gate) => gate.passed).length;
  const total = course.qualityGates.length;
  const readerUrl = `http://127.0.0.1:8766${course.reader.url ?? `/?mode=reader&course=${course.slug}`}`;

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{course.title}</h2>
            <StatusBadge status={course.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.term} / {course.slug} · {passed}/{total} gates passed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={readerUrl} target="_blank" rel="noreferrer">
              Reader <ExternalLink aria-hidden />
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={courseEndpoint({ servicesUrl, workspace, course })} target="_blank" rel="noreferrer">
              JSON <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Stage label="Raw" status={course.raw.status} detail={`${course.raw.materials.files} files`} />
        <Stage label="Extracted" status={course.extracted.status} detail={`${course.extracted.slides.files} slide decks, ${course.extracted.tasks.files} task sheets`} />
        <Stage label="Curated" status={course.curated.status} detail={`${course.curated.tasks.files} tasks, ${course.curated.solutions.files} solutions`} />
        <Stage label="Reader" status={course.reader.supported ? "complete" : "missing"} detail={course.reader.supported ? "ready" : "not ready"} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {course.qualityGates.map((gate) => (
          <div key={gate.id} className="flex items-center gap-2 text-sm">
            {gate.passed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            <span className={cn(!gate.passed && "text-muted-foreground")}>{gate.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function Stage({ label, status, detail }: { label: string; status: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        status === "complete" && "bg-emerald-100 text-emerald-800",
        status === "partial" && "bg-amber-100 text-amber-800",
        status === "missing" && "bg-secondary text-muted-foreground",
        status === "stale" && "bg-sky-100 text-sky-800",
      )}
      variant="secondary"
    >
      {pipelineStatusLabel(status)}
    </Badge>
  );
}

async function loadPipeline({
  servicesUrl,
  workspace,
  term,
}: {
  servicesUrl: string;
  workspace: string;
  term: string;
}): Promise<{ ok: true; data: StudyPipelineResponse } | { ok: false; error: string }> {
  const url = new URL("/api/study-pipeline/courses", servicesUrl);
  url.searchParams.set("workspace", workspace);
  if (term) {
    url.searchParams.set("term", term);
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: String(payload.error || `HTTP ${response.status}`) };
    }
    return { ok: true, data: payload as StudyPipelineResponse };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function currentHref({ servicesUrl, workspace, term }: { servicesUrl: string; workspace: string; term: string }) {
  return `/study-pipeline?servicesUrl=${encodeURIComponent(servicesUrl)}&workspace=${encodeURIComponent(workspace)}&term=${encodeURIComponent(term)}`;
}

function courseEndpoint({
  servicesUrl,
  workspace,
  course,
}: {
  servicesUrl: string;
  workspace: string;
  course: StudyPipelineCourse;
}) {
  const url = new URL(`/api/study-pipeline/courses/${course.slug}`, servicesUrl);
  url.searchParams.set("workspace", workspace);
  url.searchParams.set("term", course.term);
  return url.toString();
}
