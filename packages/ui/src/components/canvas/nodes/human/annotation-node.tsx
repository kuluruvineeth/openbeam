"use client";

import type {
  AnnotationColor,
  AnnotationNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeResizer, useReactFlow } from "@xyflow/react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";

export type { AnnotationColor, AnnotationNodeConfig };

export interface AnnotationNodeData {
  label: string;
  config: AnnotationNodeConfig;
  author?: string;
  timestamp?: string;
  [key: string]: unknown;
}

type AnnotationNodeType = Node<AnnotationNodeData, "annotation">;

const COLOR_CONFIG: Record<
  AnnotationColor,
  { bg: string; border: string; text: string; headerBg: string }
> = {
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-300 dark:border-yellow-800",
    text: "text-yellow-900 dark:text-yellow-100",
    headerBg: "bg-yellow-100/80 dark:bg-yellow-900/50",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    headerBg: "bg-blue-100/80 dark:bg-blue-900/50",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-300 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    headerBg: "bg-green-100/80 dark:bg-green-900/50",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-300 dark:border-pink-800",
    text: "text-pink-900 dark:text-pink-100",
    headerBg: "bg-pink-100/80 dark:bg-pink-900/50",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-300 dark:border-purple-800",
    text: "text-purple-900 dark:text-purple-100",
    headerBg: "bg-purple-100/80 dark:bg-purple-900/50",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-300 dark:border-orange-800",
    text: "text-orange-900 dark:text-orange-100",
    headerBg: "bg-orange-100/80 dark:bg-orange-900/50",
  },
};

const FONT_SIZE_CLASS = {
  sm: "text-sm",
  base: "text-base",
} as const;

export const AnnotationNode = memo(
  forwardRef<HTMLDivElement, NodeProps<AnnotationNodeType>>(
    function AnnotationNodeComponent({ data, id, selected }, ref) {
      const { setNodes } = useReactFlow();
      const color = data.config.color ?? "yellow";
      const isPinned = data.config.isPinned ?? false;
      const isCollapsed = data.config.isCollapsed ?? false;
      const content = data.config.content ?? "";
      const fontSize = data.config.fontSize ?? "sm";
      const colorCfg = COLOR_CONFIG[color];
      const hasContent = content.length > 0;
      const width = data.config.width ?? 240;
      const height = data.config.height;
      const [isEditing, setIsEditing] = useState(false);
      const [draftContent, setDraftContent] = useState(content);
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      useEffect(() => {
        if (!isEditing) {
          setDraftContent(content);
        }
      }, [content, isEditing]);

      const updateConfig = useCallback(
        (updates: Partial<AnnotationNodeConfig>) => {
          setNodes((nodes) =>
            nodes.map((node) => {
              if (node.id !== id) {
                return node;
              }
              const nodeData = node.data as AnnotationNodeData;
              return {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...nodeData.config,
                    ...updates,
                  },
                },
              };
            })
          );
        },
        [id, setNodes]
      );

      const startEditing = useCallback(() => {
        setIsEditing(true);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }, []);

      const stopEditing = useCallback(
        (commit: boolean) => {
          if (commit && draftContent !== content) {
            updateConfig({ content: draftContent });
          }
          if (!commit) {
            setDraftContent(content);
          }
          setIsEditing(false);
        },
        [content, draftContent, updateConfig]
      );

      const handleEditorKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Escape") {
            event.preventDefault();
            stopEditing(false);
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            stopEditing(true);
          }
        },
        [stopEditing]
      );

      const handleResizeEnd = useCallback(
        (_event: unknown, params: { width: number; height: number }) => {
          updateConfig({
            width: Math.round(params.width),
            height: Math.round(params.height),
          });
        },
        [updateConfig]
      );

      const containerStyle = useMemo(() => {
        const style: React.CSSProperties = {
          minWidth: 160,
          minHeight: 60,
          width,
        };
        if (height) {
          style.height = height;
        }
        return style;
      }, [height, width]);

      const handleBlur = useCallback(() => {
        stopEditing(true);
      }, [stopEditing]);

      const handleContentChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
          setDraftContent(event.target.value);
        },
        []
      );

      const contentLabel = hasContent ? content : "Edit in panel or click";
      const contentClassName = cn(
        "whitespace-pre-wrap break-words",
        FONT_SIZE_CLASS[fontSize],
        colorCfg.text,
        !hasContent && "italic opacity-50"
      );

      const contentBody = isEditing ? (
        <textarea
          className={cn(
            "size-full resize-none border-none bg-transparent outline-none",
            FONT_SIZE_CLASS[fontSize],
            colorCfg.text
          )}
          onBlur={handleBlur}
          onChange={handleContentChange}
          onKeyDown={handleEditorKeyDown}
          ref={textareaRef}
          value={draftContent}
        />
      ) : (
        <button
          className={cn("w-full flex-1 p-2.5 text-left", "cursor-text")}
          onClick={startEditing}
          type="button"
        >
          <p className={contentClassName}>{contentLabel}</p>
        </button>
      );

      if (isCollapsed) {
        return (
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-md border-2 shadow-sm transition-colors",
              colorCfg.bg,
              colorCfg.border,
              selected &&
                "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            ref={ref}
          >
            <Icons.Note className={cn("size-4", colorCfg.text)} />
          </div>
        );
      }

      return (
        <div
          className={cn(
            "flex flex-col rounded-md border-2 shadow-sm",
            colorCfg.bg,
            colorCfg.border,
            selected &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
            isPinned && "ring-1 ring-foreground/15"
          )}
          ref={ref}
          style={containerStyle}
        >
          <NodeResizer
            color="transparent"
            handleClassName="!size-2 !rounded-sm !border-2 !border-primary/50 !bg-background"
            isVisible={selected ?? false}
            maxWidth={600}
            minHeight={60}
            minWidth={160}
            onResizeEnd={handleResizeEnd}
          />

          <div
            className={cn(
              "flex items-center justify-between rounded-t-sm border-b px-2.5 py-1.5",
              colorCfg.headerBg,
              colorCfg.border
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icons.Note className={cn("size-3.5", colorCfg.text)} />
              <span
                className={cn(
                  "max-w-[180px] truncate font-medium text-xs",
                  colorCfg.text
                )}
              >
                {data.label}
              </span>
            </div>
            {isPinned && <Icons.Pin className={cn("size-3", colorCfg.text)} />}
          </div>

          {contentBody}

          {(data.author || data.timestamp) && (
            <div
              className={cn(
                "flex items-center gap-2 border-t px-2.5 py-1 text-[10px] opacity-60",
                colorCfg.border,
                colorCfg.text
              )}
            >
              {data.author && <span>{data.author}</span>}
              {data.timestamp && (
                <time dateTime={data.timestamp}>
                  {new Date(data.timestamp).toLocaleDateString()}
                </time>
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
      content: "",
      width: 240,
      isPinned: false,
      isCollapsed: false,
      fontSize: "sm",
    },
  };
}
