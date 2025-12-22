"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConnectorResource } from "@/hooks/use-connector";
import type { PreviewType } from "@/hooks/use-document-preview";
import { cn } from "@/lib/utils";
import { ResourceDocumentList } from "./resource-document-list";
import {
  formatResourceType,
  getResourceIcon,
  ICON_SIZE,
} from "./resource-icons";

export function ResourceRow({
  resource,
  connectorId,
  connectorType,
  onToggle,
  disabled,
  previewId,
  onSelectDocument,
}: {
  resource: ConnectorResource;
  connectorId: string;
  connectorType: string;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
  previewId: string | null;
  onSelectDocument: (docId: string, previewType: PreviewType) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getResourceIcon(resource.resourceType);
  const isPrivate = resource.resourceType.toLowerCase().includes("private");
  const hasDocuments = resource.documentCount > 0;

  return (
    <div className="border-border/40 border-b last:border-b-0">
      <div
        className={cn(
          "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
          disabled && "pointer-events-none",
          resource.syncEnabled
            ? "hover:bg-foreground/2"
            : "opacity-40 hover:opacity-60"
        )}
      >
        {hasDocuments ? (
          <button
            className="flex size-4 shrink-0 items-center justify-center"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <Icons.ChevronRight
              className={cn(
                "text-foreground/30 transition-transform duration-150",
                expanded && "rotate-90"
              )}
              size={ICON_SIZE.sm}
            />
          </button>
        ) : (
          <div className="size-4 shrink-0" />
        )}

        <Checkbox
          checked={resource.syncEnabled}
          className="size-3.5 border-foreground/20 data-[state=checked]:border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
          disabled={disabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />

        <div className="flex size-6 shrink-0 items-center justify-center">
          <Icon className="text-foreground/40" size={ICON_SIZE.md} />
        </div>

        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/80">
          {resource.name || "Untitled"}
          {isPrivate && (
            <Icons.LockIcon
              className="ml-1.5 inline shrink-0 text-foreground/25"
              size={ICON_SIZE.xs}
            />
          )}
        </span>

        <div className="flex items-center gap-2 text-[10px] text-foreground/35">
          <span className="hidden group-hover:inline">
            {formatResourceType(resource.resourceType)}
          </span>
          {hasDocuments && (
            <span className="font-mono tabular-nums">
              {resource.documentCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <ResourceDocumentList
          connectorId={connectorId}
          connectorType={connectorType}
          enabled={expanded}
          onSelectDocument={onSelectDocument}
          previewId={previewId}
          resourceExternalId={resource.externalId}
        />
      )}
    </div>
  );
}
