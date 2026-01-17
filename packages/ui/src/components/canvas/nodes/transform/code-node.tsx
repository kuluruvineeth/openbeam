"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Code2, Square } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface CodeNodeConfig {
  language: "javascript" | "typescript" | "python" | "json";
  code: string;
  timeout?: number;
  sandboxed?: boolean;
}

export interface CodeNodeData {
  label: string;
  config: CodeNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  status?: "idle" | "running" | "success" | "error";
  lastError?: string;
  [key: string]: unknown;
}

type CodeNodeType = Node<CodeNodeData, "code">;

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: "text-yellow-500",
  typescript: "text-blue-500",
  python: "text-green-500",
  json: "text-orange-500",
};

export const CodeNode = memo(
  forwardRef<HTMLDivElement, NodeProps<CodeNodeType>>(
    function CodeNodeComponent({ data, selected }, ref) {
      const status = data.status ?? "idle";
      const language = data.config.language ?? "javascript";
      const hasCode = (data.config.code?.length ?? 0) > 0;
      const codePreview = data.config.code?.slice(0, 50) ?? "";

      const statusColors: Record<string, string> = {
        idle: "bg-muted",
        running: "bg-blue-500/20 text-blue-500",
        success: "bg-green-500/20 text-green-500",
        error: "bg-red-500/20 text-red-500",
      };

      return (
        <div
          className={cn(
            "flex min-w-[220px] flex-col rounded-sm border border-amber-500/50 bg-amber-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-amber-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-amber-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-amber-500">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
            {status === "running" && (
              <Square className="ml-auto h-3 w-3 animate-pulse text-blue-500" />
            )}
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Language</span>
              <span
                className={cn(
                  "font-medium text-xs capitalize",
                  LANGUAGE_COLORS[language]
                )}
              >
                {language}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Status</span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-xs",
                  statusColors[status]
                )}
              >
                {status}
              </span>
            </div>

            {hasCode && (
              <div className="mt-2 rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {codePreview}
                {(data.config.code?.length ?? 0) > 50 && "..."}
              </div>
            )}

            {data.lastError && (
              <div className="rounded-sm bg-red-500/10 px-2 py-1 text-red-500 text-xs">
                {data.lastError.slice(0, 50)}
              </div>
            )}

            {data.config.sandboxed && (
              <span className="rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-amber-500 text-xs">
                Sandboxed
              </span>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-amber-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
CodeNode.displayName = "CodeNode";

export function createCodeNodeData(): CodeNodeData {
  return {
    label: "Code",
    config: {
      language: "javascript",
      code: "",
      timeout: 30_000,
      sandboxed: true,
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
    status: "idle",
  };
}
