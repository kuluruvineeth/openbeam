"use client";

import type { AnnotationColor } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Pin, StickyNote } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";

export type { AnnotationColor };

export interface AnnotationNodeConfig {
  color: AnnotationColor;
}

export interface AnnotationNodeData {
  label: string;
  config: AnnotationNodeConfig;
  content?: string;
  isPinned?: boolean;
  isExpanded?: boolean;
  author?: string;
  timestamp?: string;
  [key: string]: unknown;
}

type AnnotationNodeType = Node<AnnotationNodeData, "annotation">;

const COLOR_CONFIG: Record<
  AnnotationColor,
  { bg: string; border: string; text: string }
> = {
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-900 dark:text-yellow-100",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-100",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-900 dark:text-green-100",
  },
  pink: {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-900 dark:text-pink-100",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-100",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-900 dark:text-orange-100",
  },
};

export const AnnotationNode = memo(
  forwardRef<HTMLDivElement, NodeProps<AnnotationNodeType>>(
    function AnnotationNodeComponent({ data, selected }, ref) {
      const color = data.config.color ?? "yellow";
      const isPinned = data.isPinned ?? false;
      const isExpanded = data.isExpanded !== false;
      const colorConfig = COLOR_CONFIG[color];
      const hasContent = (data.content?.length ?? 0) > 0;

      if (!isExpanded) {
        return (
          <div
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-2 shadow-sm transition-transform hover:scale-110",
              colorConfig.bg,
              colorConfig.border,
              selected && "ring-2 ring-primary ring-offset-2"
            )}
            ref={ref}
          >
            <StickyNote className={cn("h-4 w-4", colorConfig.text)} />
          </div>
        );
      }

      return (
        <div
          className={cn(
            "min-w-[180px] max-w-[280px] rounded-md border-2 shadow-sm",
            colorConfig.bg,
            colorConfig.border,
            selected && "ring-2 ring-primary ring-offset-2",
            isPinned && "shadow-md"
          )}
          ref={ref}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b px-2 py-1",
              colorConfig.border
            )}
          >
            <div className="flex items-center gap-1">
              <StickyNote className={cn("h-3 w-3", colorConfig.text)} />
              <span className={cn("font-medium text-xs", colorConfig.text)}>
                {data.label}
              </span>
            </div>
            {isPinned && <Pin className={cn("h-3 w-3", colorConfig.text)} />}
          </div>

          <div className="p-2">
            <p
              className={cn(
                "whitespace-pre-wrap text-sm",
                colorConfig.text,
                !hasContent && "italic opacity-50"
              )}
            >
              {hasContent ? data.content : "No content..."}
            </p>
          </div>

          {(data.author || data.timestamp) && (
            <div
              className={cn(
                "border-t px-2 py-1 text-[10px] opacity-60",
                colorConfig.border,
                colorConfig.text
              )}
            >
              {data.author}
              {data.timestamp && (
                <span className="ml-2">
                  {new Date(data.timestamp).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
  )
);

AnnotationNode.displayName = "AnnotationNode";

export function createAnnotationNodeData(): AnnotationNodeData {
  return {
    label: "Note",
    config: {
      color: "yellow",
    },
    content: "",
    isPinned: false,
    isExpanded: true,
  };
}
