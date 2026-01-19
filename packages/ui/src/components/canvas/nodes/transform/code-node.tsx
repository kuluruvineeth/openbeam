"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Code2 } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface CodeNodeConfig {
  language: "javascript" | "typescript" | "python" | "json";
  code: string;
  timeout?: number;
  sandboxed?: boolean;
}

export interface CodeNodeData {
  label: string;
  config: CodeNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  lastError?: string;
  [key: string]: unknown;
}

type CodeNodeType = Node<CodeNodeData, "code">;

export const CodeNode = memo(
  forwardRef<HTMLDivElement, NodeProps<CodeNodeType>>(
    function CodeNodeComponent({ data, selected }, ref) {
      const language = data.config.language ?? "javascript";
      const hasCode = (data.config.code?.length ?? 0) > 0;
      const codePreview = data.config.code?.slice(0, 50) ?? "";

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
            colorVar="--node-code"
            icon={<Code2 className="size-5" />}
            subtitle={language}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {hasCode && (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {codePreview}
                  {(data.config.code?.length ?? 0) > 50 && "..."}
                </div>
              )}
              {data.lastError && (
                <div className="rounded-sm bg-destructive/10 px-2 py-1 text-destructive text-xs">
                  {data.lastError.slice(0, 50)}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {data.config.sandboxed && (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    Sandboxed
                  </span>
                )}
              </div>
            </div>
          </NodeSection>
        </NodeShell>
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
