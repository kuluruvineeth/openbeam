"use client";

import { Icons } from "@openbeam/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openbeam/ui/components/collapsible";
import { cn } from "@openbeam/ui/utils";
import { cva, type VariantProps } from "class-variance-authority";

const toolCallVariants = cva(
  "group flex flex-col rounded-md border transition-colors",
  {
    variants: {
      status: {
        pending: "border-border/50 bg-muted/30",
        running: "border-primary/50 bg-primary/5",
        success: "border-green-500/50 bg-green-500/5",
        error: "border-destructive/50 bg-destructive/5",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

type ToolCallStatus = "pending" | "running" | "success" | "error";

interface ToolCallRendererProps extends VariantProps<typeof toolCallVariants> {
  name: string;
  status?: ToolCallStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  defaultOpen?: boolean;
  className?: string;
}

export function ToolCallRenderer({
  name,
  status = "pending",
  input,
  output,
  error,
  duration,
  defaultOpen = false,
  className,
}: ToolCallRendererProps) {
  const hasDetails =
    input !== undefined || output !== undefined || error !== undefined;

  return (
    <div className={cn(toolCallVariants({ status }), className)}>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left">
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <span className="font-medium font-mono text-xs">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            {duration !== undefined && status !== "running" && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {duration}ms
              </span>
            )}
            {hasDetails && (
              <Icons.ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            )}
          </div>
        </CollapsibleTrigger>

        {hasDetails && (
          <CollapsibleContent>
            <div className="border-border/50 border-t px-3 py-2 text-xs">
              {input !== undefined && (
                <ToolCallSection label="Input">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                    {formatValue(input)}
                  </pre>
                </ToolCallSection>
              )}
              {output !== undefined && (
                <ToolCallSection label="Output">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                    {formatValue(output)}
                  </pre>
                </ToolCallSection>
              )}
              {error && (
                <ToolCallSection label="Error">
                  <p className="text-destructive">{error}</p>
                </ToolCallSection>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

function StatusIcon({ status }: { status: ToolCallStatus }) {
  switch (status) {
    case "pending":
      return <div className="h-2 w-2 rounded-full bg-muted-foreground" />;
    case "running":
      return <Icons.Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case "success":
      return <Icons.Check className="h-3 w-3 text-green-500" />;
    case "error":
      return <Icons.Close className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}

function ToolCallSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
