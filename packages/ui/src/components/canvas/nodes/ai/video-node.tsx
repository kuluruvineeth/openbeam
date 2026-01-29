"use client";

import { getVideoModel } from "@openplane/types/ai";
import type {
  GeneratedVideo,
  NodeStatus,
  Port,
  TokenUsage,
  VideoNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { CostIndicator, NodeToolbar, VideoPlayer } from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface VideoNodeData {
  label: string;
  config: VideoNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  video?: GeneratedVideo;
  progress?: number;
  tokenUsage?: TokenUsage;
  error?: string;
  [key: string]: unknown;
}

type VideoNodeType = Node<VideoNodeData, "video">;

export interface VideoNodeProps extends NodeProps<VideoNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onDownload?: (video: GeneratedVideo) => void;
}

export const VideoNode = memo(
  forwardRef<HTMLDivElement, VideoNodeProps>(function VideoNodeComponent(
    { id, data, selected, onRun, onStop, onDownload },
    ref
  ) {
    const modelInfo = useMemo(() => {
      const model = getVideoModel(data.config.model);
      return {
        name: model?.name ?? data.config.model,
        provider: model?.provider,
      };
    }, [data.config.model]);

    const hasVideo = Boolean(data.video);

    const handleRun = useCallback(() => {
      onRun?.(id);
    }, [id, onRun]);

    const handleStop = useCallback(() => {
      onStop?.(id);
    }, [id, onStop]);

    const handleDownload = useCallback(
      (video: GeneratedVideo) => {
        onDownload?.(video);
      },
      [onDownload]
    );

    return (
      <NodeShell
        handles={[
          { type: "target", position: Position.Left },
          { type: "source", position: Position.Right },
        ]}
        ref={ref}
        selected={selected}
        status={data.status}
      >
        <NodeHeader
          badge={
            data.isRunning ? (
              <span className="flex items-center gap-1 text-amber-500 text-xs">
                <Icons.Clapperboard className="animate-pulse" size={12} />
                {data.progress ? `${data.progress}%` : "Generating"}
              </span>
            ) : undefined
          }
          colorVar="--node-video"
          icon={<Icons.Film size={20} />}
          subtitle={modelInfo.name}
          title={data.label}
        />

        <NodeSection>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <NodeField label="Aspect" value={data.config.aspectRatio} />
              {data.tokenUsage && (
                <CostIndicator compact usage={data.tokenUsage} />
              )}
            </div>
            <NodeField
              label="Duration"
              mono
              value={`${data.config.duration}s`}
            />
            <NodeField label="Resolution" mono value={data.config.resolution} />
          </div>
        </NodeSection>

        {data.isRunning && data.progress && (
          <NodeSection className="border-border/30 border-t">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="tabular-nums">{data.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${data.progress}%` }}
                />
              </div>
            </div>
          </NodeSection>
        )}

        {(hasVideo || (data.isRunning && !data.progress)) && (
          <NodeSection className="border-border/30 border-t">
            <VideoPlayer
              isLoading={data.isRunning && !hasVideo}
              onDownload={handleDownload}
              video={data.video}
            />
          </NodeSection>
        )}

        {data.error && (
          <NodeSection className="border-border/30 border-t">
            <p className="text-destructive text-xs">{data.error}</p>
          </NodeSection>
        )}

        {selected && (
          <NodeSection className="border-border/30 border-t py-1">
            <NodeToolbar
              hasContent={hasVideo}
              isRunning={data.isRunning}
              onDownload={
                hasVideo && data.video
                  ? () => {
                      if (data.video) {
                        handleDownload(data.video);
                      }
                    }
                  : undefined
              }
              onRegenerate={handleRun}
              onRun={handleRun}
              onStop={handleStop}
              position="inline"
            />
          </NodeSection>
        )}
      </NodeShell>
    );
  })
);

VideoNode.displayName = "VideoNode";

export function createVideoNodeData(): VideoNodeData {
  return {
    label: "Video",
    config: {
      model: "runway-gen3",
      aspectRatio: "16:9",
      duration: 5,
      resolution: "1080p",
      fps: 30,
    },
    inputs: [{ id: "input", label: "Prompt", type: "data", required: true }],
    outputs: [{ id: "output", label: "Video", type: "data", required: true }],
  };
}
