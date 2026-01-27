"use client";

import type {
  CodeNodeConfig,
  CodeRuntime,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../tooltip";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

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

const RUNTIME_CONFIG: Record<
  CodeRuntime,
  { label: string; icon: keyof typeof Icons; color: string }
> = {
  javascript: { label: "JS", icon: "Braces", color: "text-yellow-500" },
  typescript: { label: "TS", icon: "FileCode", color: "text-blue-500" },
  python: { label: "PY", icon: "Code2", color: "text-green-500" },
};

function getCodePreview(code: string, maxLength = 60): string {
  if (!code) {
    return "";
  }
  const firstLine = code.split("\n")[0] || "";
  if (firstLine.length <= maxLength) {
    return firstLine;
  }
  return `${firstLine.slice(0, maxLength)}...`;
}

function CodeNodeBadges({ config }: { config: CodeNodeConfig }) {
  const inputCount = config.inputVariables?.length ?? 0;
  const outputCount = config.outputSchema?.length ?? 0;
  const hasExecution = config.lastExecution !== undefined;
  const executionSuccess = config.lastExecution?.success;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {inputCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="h-5 gap-1 px-1.5 text-[10px]" variant="secondary">
              <Icons.Download className="size-3" />
              {inputCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {inputCount} input variable{inputCount !== 1 ? "s" : ""}
          </TooltipContent>
        </Tooltip>
      )}

      {outputCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="h-5 gap-1 px-1.5 text-[10px]" variant="secondary">
              <Icons.Upload className="size-3" />
              {outputCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {outputCount} output field{outputCount !== 1 ? "s" : ""}
          </TooltipContent>
        </Tooltip>
      )}

      {config.sandboxed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="h-5 gap-1 px-1.5 text-[10px]" variant="outline">
              <Icons.LockIcon className="size-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">Sandboxed execution</TooltipContent>
        </Tooltip>
      )}

      {hasExecution && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="h-5 gap-1 px-1.5 text-[10px]"
              variant={executionSuccess ? "default" : "destructive"}
            >
              {executionSuccess ? (
                <Icons.Check className="size-3" />
              ) : (
                <Icons.XIcon className="size-3" />
              )}
              {config.lastExecution?.executionTimeMs}ms
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Last execution: {executionSuccess ? "Success" : "Failed"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export const CodeNode = memo(
  forwardRef<HTMLDivElement, NodeProps<CodeNodeType>>(
    function CodeNodeComponent({ data, selected }, ref) {
      const runtime = data.config.runtime ?? "javascript";
      const runtimeConfig = RUNTIME_CONFIG[runtime];
      const RuntimeIcon = Icons[runtimeConfig.icon];

      const hasCode = (data.config.code?.length ?? 0) > 0;
      const codePreview = useMemo(
        () => getCodePreview(data.config.code ?? ""),
        [data.config.code]
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
            colorVar="--node-code"
            icon={<Icons.Code className="size-5" />}
            subtitle={
              <div className="flex items-center gap-1.5">
                <RuntimeIcon className={`size-3 ${runtimeConfig.color}`} />
                <span>{runtimeConfig.label}</span>
              </div>
            }
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {hasCode ? (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {codePreview}
                </div>
              ) : (
                <div className="rounded-sm border border-border/50 border-dashed p-2 text-center text-[10px] text-muted-foreground/70">
                  No code
                </div>
              )}

              {data.lastError && (
                <div className="rounded-sm bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
                  {data.lastError.slice(0, 50)}
                  {data.lastError.length > 50 && "..."}
                </div>
              )}

              <CodeNodeBadges config={data.config} />
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
      runtime: "javascript",
      code: "",
      inputVariables: [],
      outputSchema: [],
      timeoutMs: 30_000,
      memoryLimitMb: 128,
      sandboxed: true,
      retryOnError: false,
      maxRetries: 3,
      enableConsole: true,
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
    status: "idle",
  };
}
