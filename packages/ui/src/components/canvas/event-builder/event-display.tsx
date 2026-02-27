"use client";

import { getResourceLabel } from "@openplane/types/services/connectors/common/resources";
import type { ConnectorType } from "@openplane/types/services/connectors/events";
import type { ComponentType } from "react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../utils/cn";
import { Badge } from "../../badge";
import { getConnectorEventUI, getConnectorIcon } from "../event-types";
import type { LogoProps } from "./event-builder";

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  slack: "Slack",
  linear: "Linear",
  notion: "Notion",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  github: "GitHub",
};

interface EventDisplayProps {
  connectorType: ConnectorType;
  eventId: string;
  resourceType?: string;
  resourceName?: string;
  showConnector?: boolean;
  logo?: ComponentType<LogoProps>;
  className?: string;
}

export const EventDisplay = memo(
  forwardRef<HTMLDivElement, EventDisplayProps>(function EventDisplayComponent(
    {
      connectorType,
      eventId,
      resourceType,
      resourceName,
      showConnector = true,
      logo,
      className,
    },
    ref
  ) {
    const event = useMemo(
      () => getConnectorEventUI(connectorType, eventId),
      [connectorType, eventId]
    );

    const FallbackIcon = getConnectorIcon(connectorType);
    const ConnectorIcon = logo ?? FallbackIcon;
    const isCustomLogo = !!logo;

    if (!event) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 text-muted-foreground text-xs",
            className
          )}
          ref={ref}
        >
          <span>Unknown event</span>
        </div>
      );
    }

    const resourceLabel = resourceType ? getResourceLabel(resourceType) : null;

    return (
      <div className={cn("flex flex-col gap-1", className)} ref={ref}>
        <div className="flex items-center gap-2 text-xs">
          {showConnector && (
            <>
              <ConnectorIcon
                className={cn(
                  "size-3.5 shrink-0",
                  !isCustomLogo && "text-muted-foreground"
                )}
                size={14}
              />
              <span className="text-muted-foreground">
                {CONNECTOR_LABELS[connectorType]}
              </span>
              <span className="text-muted-foreground">/</span>
            </>
          )}
          <span className="font-medium">{event.name}</span>
          {event.isRealtime && (
            <Badge className="px-1 py-0 text-[9px]" variant="secondary">
              Live
            </Badge>
          )}
        </div>
        {resourceName && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {resourceLabel && <span>{resourceLabel}:</span>}
            <span className="font-medium text-foreground">{resourceName}</span>
          </div>
        )}
      </div>
    );
  })
);

EventDisplay.displayName = "EventDisplay";
