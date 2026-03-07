"use client";

import { getTTSModel } from "@openbeam/types/ai";
import type {
  AudioNodeConfig,
  GeneratedAudio,
  NodeStatus,
  Port,
  TokenUsage,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { AudioPlayer, CostIndicator, NodeToolbar } from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface AudioNodeData {
  label: string;
  config: AudioNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  audio?: GeneratedAudio;
  tokenUsage?: TokenUsage;
  error?: string;
  [key: string]: unknown;
}

type AudioNodeType = Node<AudioNodeData, "audio">;

export interface AudioNodeProps extends NodeProps<AudioNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onDownload?: (audio: GeneratedAudio) => void;
}

export const AudioNode = memo(
  forwardRef<HTMLDivElement, AudioNodeProps>(function AudioNodeComponent(
    { id, data, selected, onRun, onStop, onDownload },
    ref
  ) {
    const modelInfo = useMemo(() => {
      const model = getTTSModel(data.config.model);
      return {
        name: model?.name ?? data.config.model,
        provider: model?.provider,
      };
    }, [data.config.model]);

    const hasAudio = Boolean(data.audio);

    const handleRun = useCallback(() => {
      onRun?.(id);
    }, [id, onRun]);

    const handleStop = useCallback(() => {
      onStop?.(id);
    }, [id, onStop]);

    const handleDownload = useCallback(
      (audio: GeneratedAudio) => {
        onDownload?.(audio);
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
                <Icons.Volume2 className="animate-pulse" size={12} />
                Generating
              </span>
            ) : undefined
          }
          colorVar="--node-audio"
          icon={<Icons.Mic size={20} />}
          subtitle={modelInfo.name}
          title={data.label}
        />

        <NodeSection>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <NodeField label="Voice" value={data.config.voice} />
              {data.tokenUsage && (
                <CostIndicator compact usage={data.tokenUsage} />
              )}
            </div>
            <NodeField label="Format" mono value={data.config.outputFormat} />
            {data.config.speed !== 1 && (
              <NodeField label="Speed" mono value={`${data.config.speed}x`} />
            )}
          </div>
        </NodeSection>

        {(data.isRunning || hasAudio) && (
          <NodeSection className="border-border/30 border-t">
            <AudioPlayer
              audio={data.audio}
              compact
              isLoading={data.isRunning}
              onDownload={handleDownload}
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
              hasContent={hasAudio}
              isRunning={data.isRunning}
              onDownload={
                hasAudio && data.audio
                  ? () => {
                      if (data.audio) {
                        handleDownload(data.audio);
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

AudioNode.displayName = "AudioNode";

export function createAudioNodeData(): AudioNodeData {
  return {
    label: "Audio",
    config: {
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      outputFormat: "mp3",
      speed: 1,
    },
    inputs: [{ id: "input", label: "Text", type: "data", required: true }],
    outputs: [{ id: "output", label: "Audio", type: "data", required: true }],
  };
}
