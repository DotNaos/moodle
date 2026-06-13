import type { PipelineRunsResponse } from "@/components/course-pipeline-blueprint";
import type { StudyPipelineStatusResponse } from "@/components/study-pipeline-preview";
import { isLiveStatus } from "@/components/course-pipeline-live-state";

export function hasPipelineLiveWork({
  actionIds,
  runs,
  status,
}: {
  actionIds: Array<string | null>;
  runs: PipelineRunsResponse | null;
  status: StudyPipelineStatusResponse | null;
}): boolean {
  if (actionIds.some(Boolean)) return true;
  if (isLiveStatus(status?.status)) return true;
  return (runs?.runs ?? []).some((run) => isLiveStatus(run.status));
}
