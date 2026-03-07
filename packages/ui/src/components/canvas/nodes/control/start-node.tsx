"use client";

import type { NodeStatus, Port, StartNodeConfig } from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { CronDisplay } from "../../../cron-display";
import { useCanvasContext } from "../../canvas-context";
import { EventDisplay } from "../../event-builder";
import { getTriggerType } from "../../trigger-types";
import { WebhookDisplay } from "../../webhook-builder";
import {
  NodeErrorBoundary,
  NodeHeader,
  NodeSection,
  NodeShell,
} from "../primitives";

export interface StartNodeData {
  label: string;
  config: StartNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type StartNodeType = Node<StartNodeData, "start">;

export const StartNode = memo(
  forwardRef<HTMLDivElement, NodeProps<StartNodeType>>(
    function StartNodeComponent({ data, selected }, ref) {
      const { connectorLogos } = useCanvasContext();

      const {
        triggerType = "manual",
        schedule,
        webhookConfig,
        eventConfig,
      } = data.config ?? {};

      const triggerConfig = useMemo(
        () => getTriggerType(triggerType),
        [triggerType]
      );

      const TriggerIcon = triggerConfig.icon;

      const hasDetails =
        (triggerType === "schedule" && schedule) ||
        (triggerType === "webhook" && webhookConfig?.path) ||
        (triggerType === "event" && eventConfig);

      const connectorLogo = eventConfig?.connectorType
        ? connectorLogos?.[eventConfig.connectorType]
        : undefined;

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-start"
            icon={<TriggerIcon className="size-4" />}
            subtitle={triggerConfig.name}
            title={data.label}
          />
          {hasDetails && (
            <NodeSection>
              <NodeErrorBoundary>
                {triggerType === "schedule" && schedule && (
                  <CronDisplay expression={schedule} showExpression={false} />
                )}
                {triggerType === "webhook" && webhookConfig?.path && (
                  <WebhookDisplay
                    authentication={webhookConfig.authentication}
                    compact
                    method={webhookConfig.method}
                    path={webhookConfig.path}
                  />
                )}
                {triggerType === "event" && eventConfig && (
                  <EventDisplay
                    connectorType={eventConfig.connectorType}
                    eventId={eventConfig.eventId}
                    logo={connectorLogo}
                    resourceName={eventConfig.resourceName}
                    resourceType={eventConfig.resourceType}
                  />
                )}
              </NodeErrorBoundary>
            </NodeSection>
          )}
        </NodeShell>
      );
    }
  )
);

StartNode.displayName = "StartNode";

export function createStartNodeData(
  triggerType: StartNodeConfig["triggerType"] = "manual"
): StartNodeData {
  return {
    label: "Start",
    config: { triggerType },
    inputs: [],
    outputs: [
      { id: "output", label: "Output", type: "control", required: true },
    ],
  };
}
