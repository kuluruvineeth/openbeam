"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { RRF_DEFAULTS } from "@/lib/search-config";
import type { RRFConfig, SearchTiming } from "@/lib/search-types";
import { cn } from "@/lib/utils";
import { RrfSlider } from "./rrf-slider";
import { TimingBreakdown } from "./timing-breakdown";

type AdvancedSearchPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: RRFConfig;
  onConfigChange: (config: RRFConfig) => void;
  timing?: SearchTiming | null;
  className?: string;
};

export function AdvancedSearchPanel({
  isOpen,
  onOpenChange,
  config,
  onConfigChange,
  timing,
  className,
}: AdvancedSearchPanelProps) {
  const handleReset = useCallback(() => {
    onConfigChange({
      k: RRF_DEFAULTS.k,
      weightBm25: RRF_DEFAULTS.weightBm25,
      weightDense: RRF_DEFAULTS.weightDense,
      weightSparse: RRF_DEFAULTS.weightSparse,
    });
  }, [onConfigChange]);

  return (
    <Collapsible onOpenChange={onOpenChange} open={isOpen}>
      <CollapsibleContent
        className={cn(
          "overflow-hidden",
          "data-[state=closed]:animate-accordion-up",
          "data-[state=open]:animate-accordion-down"
        )}
      >
        <section
          aria-labelledby="rrf-heading"
          className={cn(
            "border-border/50 border-b bg-muted/30 px-4 py-3",
            className
          )}
        >
          <header className="mb-3 flex items-center justify-between">
            <h3
              className="font-medium text-foreground/80 text-xs"
              id="rrf-heading"
            >
              RRF Fusion Weights
            </h3>
            <Button
              className="h-6 px-2 text-muted-foreground text-xs"
              onClick={handleReset}
              size="sm"
              variant="ghost"
            >
              Reset
            </Button>
          </header>

          <fieldset
            aria-label="Weight sliders"
            className="grid gap-4 border-0 p-0 sm:grid-cols-3"
          >
            <RrfSlider
              id="weight-bm25"
              label="Keyword (BM25)"
              onValueChange={(v) =>
                onConfigChange({ ...config, weightBm25: v })
              }
              value={config.weightBm25}
            />
            <RrfSlider
              id="weight-dense"
              label="Semantic (Dense)"
              onValueChange={(v) =>
                onConfigChange({ ...config, weightDense: v })
              }
              value={config.weightDense}
            />
            <RrfSlider
              id="weight-sparse"
              label="Sparse"
              onValueChange={(v) =>
                onConfigChange({ ...config, weightSparse: v })
              }
              value={config.weightSparse}
            />
          </fieldset>

          {timing && (
            <footer className="mt-3 border-border/30 border-t pt-3">
              <TimingBreakdown timing={timing} />
            </footer>
          )}
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
