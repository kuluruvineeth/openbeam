"use client";

import { cva } from "class-variance-authority";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

const strengthBarStyles = cva("h-1.5 rounded-full transition-all", {
  variants: {
    strength: {
      weak: "bg-red-500",
      fair: "bg-amber-500",
      good: "bg-green-500",
      excellent: "bg-emerald-500",
    },
  },
  defaultVariants: {
    strength: "weak",
  },
});

type PromptStrength = "weak" | "fair" | "good" | "excellent";

interface PromptAnalysis {
  strength: PromptStrength;
  score: number;
  suggestions: string[];
}

const WHITESPACE_REGEX = /\s+/;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: prompt analysis requires multiple conditional checks
function analyzePrompt(prompt: string): PromptAnalysis {
  if (!prompt.trim()) {
    return {
      strength: "weak",
      score: 0,
      suggestions: ["Add a prompt to get started"],
    };
  }

  const suggestions: string[] = [];
  let score = 0;
  const words = prompt.trim().split(WHITESPACE_REGEX).length;

  if (words >= 5) {
    score += 20;
  } else {
    suggestions.push("Add more detail to your prompt");
  }

  if (words >= 15) {
    score += 15;
  }

  if (
    prompt.includes("you are") ||
    prompt.includes("your role") ||
    prompt.includes("act as")
  ) {
    score += 20;
  } else {
    suggestions.push("Consider defining a role for the AI");
  }

  if (
    prompt.includes("format") ||
    prompt.includes("structure") ||
    prompt.includes("output")
  ) {
    score += 15;
  } else {
    suggestions.push("Specify desired output format");
  }

  if (
    prompt.includes("example") ||
    prompt.includes("such as") ||
    prompt.includes("like")
  ) {
    score += 15;
  } else {
    suggestions.push("Include examples for clarity");
  }

  if (
    prompt.includes("constraints") ||
    prompt.includes("limit") ||
    prompt.includes("avoid") ||
    prompt.includes("must")
  ) {
    score += 15;
  }

  let strength: PromptStrength;
  if (score < 25) {
    strength = "weak";
  } else if (score < 50) {
    strength = "fair";
  } else if (score < 75) {
    strength = "good";
  } else {
    strength = "excellent";
  }

  return { strength, score: Math.min(100, score), suggestions };
}

export interface PromptStrengthIndicatorProps {
  prompt: string;
  onImprove?: () => void;
  showSuggestions?: boolean;
  compact?: boolean;
  className?: string;
}

export const PromptStrengthIndicator = memo(
  forwardRef<HTMLDivElement, PromptStrengthIndicatorProps>(
    function PromptStrengthIndicatorComponent(
      { prompt, onImprove, showSuggestions = true, compact = false, className },
      ref
    ) {
      const analysis = useMemo(() => analyzePrompt(prompt), [prompt]);

      const strengthIcons = {
        excellent: Icons.CheckCircle,
        good: Icons.Sparkles,
        fair: Icons.AlertCircle,
        weak: Icons.AlertCircle,
      } as const;
      const Icon = strengthIcons[analysis.strength];

      const strengthLabel = {
        weak: "Weak",
        fair: "Fair",
        good: "Good",
        excellent: "Excellent",
      }[analysis.strength];

      if (compact) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn("flex items-center gap-1.5 text-xs", className)}
                ref={ref}
              >
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      strengthBarStyles({ strength: analysis.strength })
                    )}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {analysis.score}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="font-medium">{strengthLabel} prompt</span>
                </div>
                {analysis.suggestions.length > 0 && (
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    {analysis.suggestions.map((suggestion) => (
                      <li key={suggestion}>• {suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <div
          className={cn(
            "space-y-2 rounded-md border bg-muted/30 p-3",
            className
          )}
          ref={ref}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  analysis.strength === "excellent" && "text-emerald-500",
                  analysis.strength === "good" && "text-green-500",
                  analysis.strength === "fair" && "text-amber-500",
                  analysis.strength === "weak" && "text-red-500"
                )}
                size={16}
              />
              <span className="font-medium text-sm">
                {strengthLabel} prompt
              </span>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {analysis.score}%
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(strengthBarStyles({ strength: analysis.strength }))}
              style={{ width: `${analysis.score}%` }}
            />
          </div>

          {showSuggestions && analysis.suggestions.length > 0 && (
            <ul className="space-y-1 pt-1">
              {analysis.suggestions.slice(0, 3).map((suggestion) => (
                <li
                  className="flex items-start gap-1.5 text-muted-foreground text-xs"
                  key={suggestion}
                >
                  <span className="mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}

          {onImprove && analysis.strength !== "excellent" && (
            <Button
              className="mt-2 h-7 w-full text-xs"
              onClick={onImprove}
              size="sm"
              variant="outline"
            >
              <Icons.Wand className="mr-1.5" size={12} />
              Improve prompt
            </Button>
          )}
        </div>
      );
    }
  )
);

PromptStrengthIndicator.displayName = "PromptStrengthIndicator";
