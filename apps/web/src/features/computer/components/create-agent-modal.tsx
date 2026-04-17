"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils/cn";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { useComputerCatalog, useEnableAgent } from "../hooks/use-computer";

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentModal({
  open,
  onOpenChange,
}: CreateAgentModalProps) {
  const { data: catalog, isLoading } = useComputerCatalog();
  const enableAgent = useEnableAgent();
  const [selected, setSelected] = useState<string | null>(null);

  function handleEnable() {
    if (!selected) {
      return;
    }
    enableAgent.mutate(
      { templateId: selected },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enable Agent</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <CatalogSkeleton />
        ) : (
          <div className="space-y-1">
            {catalog?.map((template) => (
              <button
                className={cn(
                  "flex w-full flex-col gap-1 rounded-sm border px-3 py-2.5 text-left transition-colors",
                  selected === template.templateId
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/30 hover:border-border hover:bg-muted/30"
                )}
                key={template.templateId}
                onClick={() => setSelected(template.templateId)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{template.name}</span>
                  {template.scheduleCron && (
                    <Badge
                      className="px-1.5 py-0 text-[10px]"
                      variant="outline"
                    >
                      <Icons.ClockIcon size={10} />
                      {template.scheduleCron}
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!selected || enableAgent.isPending}
            onClick={handleEnable}
            size="sm"
          >
            {enableAgent.isPending ? "Enabling..." : "Enable"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton className="h-16 w-full" key={`cat-sk-${i.toString()}`} />
      ))}
    </div>
  );
}
