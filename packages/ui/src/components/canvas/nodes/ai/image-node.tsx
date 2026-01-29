"use client";

import { getImageModel } from "@openplane/types/ai";
import type {
  GeneratedImage,
  ImageNodeConfig,
  NodeStatus,
  Port,
  TokenUsage,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { CostIndicator, ImageGallery, NodeToolbar } from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ImageNodeData {
  label: string;
  config: ImageNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  images?: GeneratedImage[];
  tokenUsage?: TokenUsage;
  error?: string;
  [key: string]: unknown;
}

type ImageNodeType = Node<ImageNodeData, "image">;

export interface ImageNodeProps extends NodeProps<ImageNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onDownload?: (image: GeneratedImage) => void;
  onVariation?: (image: GeneratedImage) => void;
  onImageSelect?: (image: GeneratedImage) => void;
}

export const ImageNode = memo(
  forwardRef<HTMLDivElement, ImageNodeProps>(function ImageNodeComponent(
    {
      id,
      data,
      selected,
      onRun,
      onStop,
      onDownload,
      onVariation,
      onImageSelect,
    },
    ref
  ) {
    const modelInfo = useMemo(() => {
      const model = getImageModel(data.config.model);
      return {
        name: model?.name ?? data.config.model,
        provider: model?.provider,
      };
    }, [data.config.model]);

    const hasImages = data.images && data.images.length > 0;

    const handleRun = useCallback(() => {
      onRun?.(id);
    }, [id, onRun]);

    const handleStop = useCallback(() => {
      onStop?.(id);
    }, [id, onStop]);

    const handleDownload = useCallback(
      (image: GeneratedImage) => {
        onDownload?.(image);
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
                <Icons.Sparkles className="animate-pulse" size={12} />
                Generating
              </span>
            ) : undefined
          }
          colorVar="--node-image"
          icon={<Icons.ImageIcon size={20} />}
          subtitle={modelInfo.name}
          title={data.label}
        />

        <NodeSection>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <NodeField label="Size" mono value={data.config.size} />
              {data.tokenUsage && (
                <CostIndicator compact usage={data.tokenUsage} />
              )}
            </div>
            <NodeField
              label="Quality"
              value={data.config.quality ?? "standard"}
            />
            {data.config.numberOfImages > 1 && (
              <NodeField
                label="Count"
                mono
                value={data.config.numberOfImages}
              />
            )}
          </div>
        </NodeSection>

        {(data.isRunning || hasImages) && (
          <NodeSection className="border-border/30 border-t">
            <ImageGallery
              columns={data.config.numberOfImages > 1 ? 2 : 1}
              images={data.images ?? []}
              isLoading={data.isRunning}
              onDownload={handleDownload}
              onImageSelect={onImageSelect}
              onVariation={onVariation}
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
              hasContent={hasImages}
              isRunning={data.isRunning}
              onDownload={
                hasImages && data.images?.[0]
                  ? () => {
                      const image = data.images?.[0];
                      if (image) {
                        handleDownload(image);
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

ImageNode.displayName = "ImageNode";

export function createImageNodeData(): ImageNodeData {
  return {
    label: "Image",
    config: {
      model: "dall-e-3",
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
      numberOfImages: 1,
      enhancePrompt: true,
    },
    inputs: [{ id: "input", label: "Prompt", type: "data", required: true }],
    outputs: [{ id: "output", label: "Images", type: "data", required: true }],
  };
}
