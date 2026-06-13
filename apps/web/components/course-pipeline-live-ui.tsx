import { Activity, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { BlueprintLiveState } from "@/components/course-pipeline-blueprint-model";
import { cn } from "@/lib/utils";

export function PipelineStatusBadge({
  active,
  live,
  status,
}: {
  active?: boolean;
  live?: BlueprintLiveState;
  status?: string;
}) {
  const display = active ? "active" : live?.label ?? status;
  if (!display) return null;
  return <Badge variant={statusBadgeVariant(live?.status ?? status)}>{display}</Badge>;
}

export function NodeLiveIndicator({ live }: { live?: BlueprintLiveState }) {
  if (!live?.current && live?.status !== "failed") return null;
  return (
    <span
      className={cn(
        "absolute right-3 top-3 grid size-7 place-items-center rounded-full",
        live.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
      )}
      title={live.detail ?? live.label}
    >
      {live.current ? <Spinner aria-hidden className="size-3.5" /> : <AlertCircle aria-hidden className="size-3.5" />}
    </span>
  );
}

export function LiveStatePanel({ live }: { live: BlueprintLiveState }) {
  const Icon = live.status === "failed"
    ? AlertCircle
    : live.status === "succeeded"
      ? CheckCircle2
      : live.current
        ? Activity
        : Clock3;
  return (
    <div className="grid gap-3 rounded-2xl bg-background/70 px-3 py-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full",
            live.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          {live.current ? <Spinner aria-hidden className="size-4" /> : <Icon aria-hidden className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{live.label}</p>
          {live.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{live.detail}</p> : null}
        </div>
      </div>
      <div className="grid gap-2">
        {live.runId ? <LiveRow label="Run" value={live.runId} /> : null}
        {live.startedAt ? <LiveRow label="Started" value={formatShortDate(live.startedAt)} /> : null}
        {live.finishedAt ? <LiveRow label="Finished" value={formatShortDate(live.finishedAt)} /> : null}
      </div>
    </div>
  );
}

export function liveNodeClass(live?: BlueprintLiveState): string {
  if (!live) return "";
  if (live.status === "failed") return "ring-2 ring-destructive/35";
  if (live.current) return "ring-2 ring-primary/35";
  return "";
}

function LiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium text-foreground">{value}</span>
    </div>
  );
}

function statusBadgeVariant(status?: string): "default" | "destructive" | "outline" | "secondary" {
  if (status === "failed" || status === "error") return "destructive";
  if (status === "running" || status === "queued" || status === "succeeded" || status === "ok" || status === "active") return "default";
  if (status === "missing" || status === "pending" || status === "not_started") return "outline";
  return "secondary";
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}
