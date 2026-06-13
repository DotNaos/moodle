import { Badge } from "@/components/ui/badge";
import type { BlueprintProblem } from "@/components/course-pipeline-blueprint-model";

export function LossTracePanel({
  evidence,
  problems,
}: {
  evidence: string[];
  problems: BlueprintProblem[];
}) {
  return (
    <div className="grid gap-2">
      {problems.map((problem) => (
        <div className="rounded-2xl bg-background/80 px-3 py-2" key={`${problem.label}:${problem.detail}`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-destructive">{problem.label}</p>
            <Badge variant="destructive">{problem.severity}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-destructive/80">{problem.detail}</p>
        </div>
      ))}
      {evidence.length > 0 ? (
        <div className="rounded-2xl bg-background/70 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">Image trace evidence</p>
          <div className="mt-2 grid gap-1">
            {evidence.map((item) => (
              <p className="text-xs leading-5 text-foreground/80" key={item}>{item}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
