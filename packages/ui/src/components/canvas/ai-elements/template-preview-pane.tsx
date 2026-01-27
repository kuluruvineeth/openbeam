"use client";

import type {
  TemplateOutputFormat,
  TemplateVariable,
} from "@openplane/types/canvas";
import { memo, useMemo } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Icons } from "../../icons";
import { ScrollArea } from "../../scroll-area";

export interface TemplatePreviewPaneProps {
  template: string;
  variables: TemplateVariable[];
  testData: Record<string, unknown>;
  outputFormat: TemplateOutputFormat;
  error?: string;
  className?: string;
}

function renderPreview(
  template: string,
  testData: Record<string, unknown>
): string {
  let result = template;

  for (const [key, value] of Object.entries(testData)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(pattern, String(value ?? ""));
  }

  result = result.replace(
    /\{\{#each\s+\w+\}\}[\s\S]*?\{\{\/each\}\}/g,
    "[Array items...]"
  );
  result = result.replace(
    /\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g,
    "[Conditional content]"
  );
  result = result.replace(/\{\{[^{}]+\}\}/g, (match) => {
    const varName = match.replace(/[{}]/g, "").trim();
    return `[${varName}]`;
  });

  return result;
}

export const TemplatePreviewPane = memo(function TemplatePreviewPaneComponent({
  template,
  variables,
  testData,
  outputFormat,
  error,
  className,
}: TemplatePreviewPaneProps) {
  const preview = useMemo(() => {
    if (error) {
      return null;
    }
    if (!template) {
      return null;
    }
    return renderPreview(template, testData);
  }, [template, testData, error]);

  const formattedPreview = useMemo(() => {
    if (!preview) {
      return preview;
    }

    if (outputFormat === "json") {
      try {
        const parsed = JSON.parse(preview);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return preview;
      }
    }

    return preview;
  }, [preview, outputFormat]);

  const missingVariables = useMemo(
    () => variables.filter((v) => v.required && !(v.name in testData)),
    [variables, testData]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.Eye className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">Preview</span>
        </div>
        <Badge variant="outline">{outputFormat}</Badge>
      </div>

      {missingVariables.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
          <span className="text-amber-600 text-xs">Missing test data:</span>
          {missingVariables.map((v) => (
            <Badge className="text-[10px]" key={v.id} variant="outline">
              {v.name}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-start gap-2 text-destructive text-sm">
            <Icons.AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!error && template && (
        <ScrollArea className="max-h-[200px]">
          <pre
            className={cn(
              "rounded-md bg-muted/30 p-3 font-mono text-xs",
              outputFormat === "markdown" && "whitespace-pre-wrap"
            )}
          >
            {formattedPreview}
          </pre>
        </ScrollArea>
      )}

      {!(error || template) && (
        <div className="rounded-md border border-border/50 border-dashed py-8 text-center text-muted-foreground text-xs">
          Enter a template to see preview
        </div>
      )}
    </div>
  );
});

TemplatePreviewPane.displayName = "TemplatePreviewPane";
