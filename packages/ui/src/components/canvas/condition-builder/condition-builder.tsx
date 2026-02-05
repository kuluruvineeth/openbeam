"use client";

import type {
  AdvancedConditionConfig,
  ConditionBranch,
  ConditionBuilderMode,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { ScrollArea } from "../../scroll-area";
import { Textarea } from "../../textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../tooltip";
import { BranchList } from "./branch-list";

interface ConditionBuilderProps {
  config: AdvancedConditionConfig;
  onChange: (config: AdvancedConditionConfig) => void;
  fieldSuggestions?: string[];
  className?: string;
}

export const ConditionBuilder = memo(
  forwardRef<HTMLDivElement, ConditionBuilderProps>(
    function ConditionBuilderComponent(
      { config, onChange, fieldSuggestions, className },
      ref
    ) {
      const handleModeChange = useCallback(
        (mode: ConditionBuilderMode) => {
          onChange({ ...config, mode });
        },
        [config, onChange]
      );

      const handleBranchesChange = useCallback(
        (branches: ConditionBranch[]) => {
          onChange({ ...config, branches });
        },
        [config, onChange]
      );

      const handleExpressionChange = useCallback(
        (expression: string) => {
          onChange({ ...config, expression });
        },
        [config, onChange]
      );

      const handleDefaultLabelChange = useCallback(
        (defaultBranchLabel: string) => {
          onChange({ ...config, defaultBranchLabel });
        },
        [config, onChange]
      );

      const expressionValidation = useMemo(() => {
        if (config.mode !== "expression" || !config.expression?.trim()) {
          return null;
        }
        try {
          new Function("input", config.expression);
          return { valid: true, error: null };
        } catch (e) {
          const message =
            e instanceof SyntaxError ? e.message : "Invalid syntax";
          return { valid: false, error: message };
        }
      }, [config.mode, config.expression]);

      return (
        <div className={cn("space-y-4", className)} ref={ref}>
          <div className="flex items-center justify-between">
            <ModeToggle mode={config.mode} onModeChange={handleModeChange} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Help: Learn about visual and expression modes"
                    className="text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <Icons.HelpCircle className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="left">
                  <p className="text-xs">
                    <strong>Visual mode:</strong> Build conditions using
                    dropdowns and inputs. Best for most users.
                  </p>
                  <p className="mt-1 text-xs">
                    <strong>Expression mode:</strong> Write JavaScript
                    expressions for complex logic.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {config.mode === "visual" ? (
            <>
              <BranchList
                branches={config.branches}
                fieldSuggestions={fieldSuggestions}
                onChange={handleBranchesChange}
              />

              {config.branches.length > 0 && (
                <div className="rounded-md border border-border/50 border-dashed p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-muted-foreground/30" />
                    <span className="text-muted-foreground text-sm">
                      Default path
                    </span>
                  </div>
                  <Input
                    className="mt-2 h-8 text-sm"
                    onChange={(e) => handleDefaultLabelChange(e.target.value)}
                    placeholder="Default (when no branch matches)"
                    value={config.defaultBranchLabel}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  "overflow-hidden rounded-md border bg-card/30 p-3",
                  expressionValidation?.valid === false
                    ? "border-destructive/50"
                    : "border-border/50"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <label
                    className="text-muted-foreground text-xs"
                    htmlFor="condition-expression"
                  >
                    JavaScript expression
                  </label>
                  {expressionValidation && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        expressionValidation.valid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      )}
                    >
                      {expressionValidation.valid ? (
                        <>
                          <Icons.CheckCircle2 className="size-3" />
                          Valid
                        </>
                      ) : (
                        <>
                          <Icons.XCircle className="size-3" />
                          Invalid
                        </>
                      )}
                    </span>
                  )}
                </div>
                <ScrollArea className="h-[140px] overflow-hidden" hideScrollbar>
                  <Textarea
                    className="min-h-[120px] resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-sm focus-visible:ring-0"
                    id="condition-expression"
                    onChange={(e) => handleExpressionChange(e.target.value)}
                    placeholder={`// Access input data via 'input' variable
// Return the branch name to execute

if (input.status === 'approved') {
  return 'approved';
} else if (input.amount > 1000) {
  return 'high_value';
}
return 'default';`}
                    value={config.expression}
                  />
                </ScrollArea>
              </div>

              {expressionValidation?.valid === false && (
                <div className="rounded-sm bg-destructive/10 p-2 text-destructive text-xs">
                  <Icons.XCircle className="mr-1 inline size-3.5" />
                  {expressionValidation.error}
                </div>
              )}

              <div className="rounded-sm bg-amber-500/10 p-2 text-amber-600 text-xs dark:text-amber-400">
                <Icons.AlertTriangle className="mr-1 inline size-3.5" />
                Expression mode requires JavaScript knowledge. Use visual mode
                for simpler logic.
              </div>
            </div>
          )}
        </div>
      );
    }
  )
);

ConditionBuilder.displayName = "ConditionBuilder";

interface ModeToggleProps {
  mode: ConditionBuilderMode;
  onModeChange: (mode: ConditionBuilderMode) => void;
}

const ModeToggle = memo(function ModeToggleComponent({
  mode,
  onModeChange,
}: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md bg-secondary/50 p-0.5">
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium text-xs transition-colors",
          mode === "visual"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onModeChange("visual")}
        type="button"
      >
        <Icons.Layers className="size-3.5" />
        Visual
      </button>
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium text-xs transition-colors",
          mode === "expression"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onModeChange("expression")}
        type="button"
      >
        <Icons.Code className="size-3.5" />
        Expression
      </button>
    </div>
  );
});

ModeToggle.displayName = "ModeToggle";
