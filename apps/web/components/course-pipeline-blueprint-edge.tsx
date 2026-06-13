"use client";

import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

type PipelineEdgeData = {
  renderStyle?: "rounded" | "square";
};

export function PipelineCableEdge(props: EdgeProps) {
  const renderStyle = (props.data as PipelineEdgeData | undefined)?.renderStyle ?? "rounded";
  const [path] = renderStyle === "square" ? manhattanPath(props) : getBezierPath(props);

  return (
    <BaseEdge
      id={props.id}
      interactionWidth={18}
      path={path}
      style={props.style}
    />
  );
}

function manhattanPath({
  sourceX,
  sourceY,
  sourceHandleId,
  targetX,
  targetY,
}: EdgeProps): [string] {
  const distance = Math.max(80, targetX - sourceX);
  const trackOffset = channelTrackOffset(sourceHandleId);
  const trackX = sourceX + distance * 0.44 + trackOffset;

  if (Math.abs(sourceY - targetY) < 4) {
    return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`];
  }

  return [`M ${sourceX} ${sourceY} L ${trackX} ${sourceY} L ${trackX} ${targetY} L ${targetX} ${targetY}`];
}

function channelTrackOffset(sourceHandleId: string | null | undefined): number {
  const slot = Number(sourceHandleId?.replace("out-", ""));
  if (!Number.isFinite(slot)) return 0;
  return (slot - 2) * 18;
}
