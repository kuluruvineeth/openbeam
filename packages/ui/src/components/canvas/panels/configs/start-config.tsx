"use client";

import type { StartNodeConfig } from "@openplane/types/canvas";
import type { ConnectorType } from "@openplane/types/services/connectors/events";
import type { ComponentType } from "react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { ScheduleBuilder } from "../../../schedule-builder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../../select";
import type {
  ConnectorInfo,
  EventConfig,
  LogoProps,
  ResourceInfo,
} from "../../event-builder";
import { EventBuilder } from "../../event-builder";
import { getTriggerType, TRIGGER_TYPE_LIST } from "../../trigger-types";
import { WebhookBuilder } from "../../webhook-builder";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface StartConfigPanelProps {
  config: StartNodeConfig;
  onChange: (config: Partial<StartNodeConfig>) => void;
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
}

export const StartConfigPanel = memo(
  forwardRef<HTMLDivElement, StartConfigPanelProps>(
    function StartConfigPanelComponent(
      { config, onChange, connectorLogos, connectors, onFetchResources },
      ref
    ) {
      const triggerType = config.triggerType ?? "manual";

      const selectedTrigger = useMemo(
        () => getTriggerType(triggerType),
        [triggerType]
      );

      const SelectedIcon = selectedTrigger.icon;

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Play className="size-4" />}
            title="Trigger"
          >
            <div className="space-y-4">
              <ConfigField label="Trigger Type" required>
                <Select
                  onValueChange={(value) =>
                    onChange({
                      triggerType: value as StartNodeConfig["triggerType"],
                    })
                  }
                  value={triggerType}
                >
                  <SelectTrigger className="h-9">
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="size-4 text-muted-foreground" />
                      <span>{selectedTrigger.name}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPE_LIST.map((trigger) => {
                      const TriggerIcon = trigger.icon;
                      return (
                        <SelectItem
                          className="py-2"
                          key={trigger.id}
                          value={trigger.id}
                        >
                          <div className="flex items-start gap-2">
                            <TriggerIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">
                                {trigger.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {trigger.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </ConfigField>

              {triggerType === "schedule" && (
                <ScheduleBuilder
                  onChange={(schedule) => onChange({ schedule })}
                  value={config.schedule}
                />
              )}

              {triggerType === "webhook" && (
                <WebhookBuilder
                  onChange={(webhookConfig) => onChange({ webhookConfig })}
                  value={config.webhookConfig}
                />
              )}

              {triggerType === "event" && (
                <EventBuilder
                  connectors={connectors}
                  logos={connectorLogos}
                  onChange={(eventConfig: EventConfig) =>
                    onChange({ eventConfig })
                  }
                  onFetchResources={onFetchResources}
                  value={config.eventConfig}
                />
              )}
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

StartConfigPanel.displayName = "StartConfigPanel";
