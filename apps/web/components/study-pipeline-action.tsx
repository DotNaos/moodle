"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiRequest, getErrorMessage } from "@/lib/moodle-api";

type StudyPipelineResponse = {
  status: string;
  summary: {
    totalResources: number;
    slides: number;
    scripts: number;
    tasks: number;
    solutions: number;
    linkedSolutions: number;
    missingSolutions: number;
  };
};

export function StudyPipelineAction({ courseId }: { courseId: string }) {
  const [pipeline, setPipeline] = useState<StudyPipelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPipeline() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<StudyPipelineResponse>(
        `/courses/${encodeURIComponent(courseId)}/study-pipeline`,
        { method: "POST", body: "{}" },
      );
      setPipeline(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  const summary = pipeline?.summary;

  return (
    <div className="mt-5 border-t border-border/60 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Study material</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a course plan from Moodle resources.
          </p>
        </div>
        <Button onClick={createPipeline} disabled={loading} size="sm">
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          Create
        </Button>
      </div>
      {summary ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            Plan created
          </span>
          <span>{summary.slides + summary.scripts} script items</span>
          <span>{summary.tasks} tasks</span>
          <span>{summary.linkedSolutions} linked solutions</span>
          {summary.missingSolutions > 0 ? (
            <span>{summary.missingSolutions} missing solutions</span>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
