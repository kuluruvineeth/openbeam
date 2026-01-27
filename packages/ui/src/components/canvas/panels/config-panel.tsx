"use client";

import type {
  AnnotationNodeConfig,
  ApprovalNodeConfig,
  AudioNodeConfig,
  CanvasNodeType,
  ClassifyNodeConfig,
  CodeNodeConfig,
  ConditionNodeConfig,
  ConnectorActionNodeConfig,
  ConnectorActionsRegistry,
  ConnectorNodeConfig,
  ExtractNodeConfig,
  FilterNodeConfig,
  ImageNodeConfig,
  InputNodeConfig,
  LlmNodeConfig,
  LoopNodeConfig,
  NodeStatus,
  NotifyNodeConfig,
  ParallelJoinNodeConfig,
  ParallelSplitNodeConfig,
  RagNodeConfig,
  StartNodeConfig,
  SummarizeNodeConfig,
  TemplateNodeConfig,
  VideoNodeConfig,
} from "@openplane/types/canvas";
import type { ConnectorType } from "@openplane/types/services/connectors/events";
import type { ComponentType } from "react";
import { forwardRef, memo, useCallback } from "react";
import { Input } from "../../input";
import { ScrollArea } from "../../scroll-area";
import { Sheet, SheetContent } from "../../sheet";
import { Textarea } from "../../textarea";
import type { ConnectorInfo, LogoProps, ResourceInfo } from "../event-builder";
import { ConfigField } from "./config-field";
import { ConfigPanelHeader } from "./config-panel-header";
import { ConfigSection } from "./config-section";
import {
  AnnotationConfigPanel,
  ApprovalConfigPanel,
  AudioConfigPanel,
  ClassifyConfigPanel,
  CodeConfigPanel,
  ConditionConfigPanel,
  ConnectorActionConfigPanel,
  ConnectorConfigPanel,
  ExtractConfigPanel,
  FilterConfigPanel,
  ImageConfigPanel,
  InputConfigPanel,
  LlmConfigPanel,
  LoopConfigPanel,
  NotifyConfigPanel,
  ParallelJoinConfigPanel,
  ParallelSplitConfigPanel,
  RagConfigPanel,
  StartConfigPanel,
  SummarizeConfigPanel,
  TemplateConfigPanel,
  VideoConfigPanel,
} from "./configs";

interface ConfigPanelBaseProps {
  nodeId: string;
  nodeType: CanvasNodeType;
  nodeLabel: string;
  nodeStatus?: NodeStatus;
  nodeConfig: Record<string, unknown>;
  onLabelChange?: (label: string) => void;
  onConfigChange?: (nodeId: string, config: Record<string, unknown>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  actionRegistries?: ConnectorActionsRegistry[];
}

interface StandaloneConfigPanelProps extends ConfigPanelBaseProps {
  embedded?: false;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: never;
}

interface EmbeddedConfigPanelProps extends ConfigPanelBaseProps {
  embedded: true;
  onClose?: () => void;
  open?: never;
  onOpenChange?: never;
}

export type ConfigPanelProps =
  | StandaloneConfigPanelProps
  | EmbeddedConfigPanelProps;

const ConfigPanelContent = memo(
  forwardRef<HTMLDivElement, ConfigPanelBaseProps & { onClose?: () => void }>(
    function ConfigPanelContentComponent(
      {
        nodeId,
        nodeType,
        nodeLabel,
        nodeStatus = "idle",
        nodeConfig,
        onLabelChange,
        onConfigChange,
        onDelete,
        onDuplicate,
        onClose,
        connectorLogos,
        connectors,
        onFetchResources,
        actionRegistries,
      },
      ref
    ) {
      const handleConfigChange = useCallback(
        (updates: Record<string, unknown>) => {
          onConfigChange?.(nodeId, { ...nodeConfig, ...updates });
        },
        [nodeId, nodeConfig, onConfigChange]
      );

      const renderNodeConfig = () => {
        switch (nodeType) {
          case "start":
            return (
              <StartConfigPanel
                config={nodeConfig as StartNodeConfig}
                connectorLogos={connectorLogos}
                connectors={connectors}
                onChange={handleConfigChange}
                onFetchResources={onFetchResources}
              />
            );
          case "llm":
            return (
              <LlmConfigPanel
                config={nodeConfig as LlmNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "rag":
            return (
              <RagConfigPanel
                config={nodeConfig as RagNodeConfig}
                connectorLogos={connectorLogos}
                onChange={handleConfigChange}
              />
            );
          case "condition":
            return (
              <ConditionConfigPanel
                config={nodeConfig as ConditionNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "loop":
            return (
              <LoopConfigPanel
                config={nodeConfig as LoopNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "parallel_split":
            return (
              <ParallelSplitConfigPanel
                config={nodeConfig as ParallelSplitNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "parallel_join":
            return (
              <ParallelJoinConfigPanel
                config={nodeConfig as ParallelJoinNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "code":
            return (
              <CodeConfigPanel
                config={nodeConfig as CodeNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "approval":
            return (
              <ApprovalConfigPanel
                config={nodeConfig as ApprovalNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "image":
            return (
              <ImageConfigPanel
                config={nodeConfig as ImageNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "input":
            return (
              <InputConfigPanel
                config={nodeConfig as InputNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "audio":
            return (
              <AudioConfigPanel
                config={nodeConfig as AudioNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "video":
            return (
              <VideoConfigPanel
                config={nodeConfig as VideoNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "summarize":
            return (
              <SummarizeConfigPanel
                config={nodeConfig as SummarizeNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "extract":
            return (
              <ExtractConfigPanel
                config={nodeConfig as ExtractNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "classify":
            return (
              <ClassifyConfigPanel
                config={nodeConfig as ClassifyNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "filter":
            return (
              <FilterConfigPanel
                config={nodeConfig as FilterNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "template":
            return (
              <TemplateConfigPanel
                config={nodeConfig as TemplateNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "annotation":
            return (
              <AnnotationConfigPanel
                config={nodeConfig as AnnotationNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "notify":
            return (
              <NotifyConfigPanel
                config={nodeConfig as NotifyNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "connector":
            return (
              <ConnectorConfigPanel
                actionRegistries={actionRegistries}
                config={nodeConfig as ConnectorNodeConfig}
                connectorLogos={connectorLogos}
                connectors={connectors}
                onChange={handleConfigChange}
                onFetchResources={onFetchResources}
              />
            );
          case "connector_action":
            return (
              <ConnectorActionConfigPanel
                config={nodeConfig as ConnectorActionNodeConfig}
                onChange={handleConfigChange}
              />
            );
          default:
            return null;
        }
      };

      const nodeSpecificConfig = renderNodeConfig();

      return (
        <div className="flex h-full w-full min-w-0 flex-col" ref={ref}>
          <ConfigPanelHeader
            nodeId={nodeId}
            nodeLabel={nodeLabel}
            nodeType={nodeType}
            onClose={onClose}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onLabelChange={onLabelChange}
            status={nodeStatus}
          />

          <ScrollArea className="min-w-0 flex-1">
            <div className="min-w-0 divide-y divide-border/50">
              <ConfigSection collapsible={false} defaultOpen title="General">
                <div className="space-y-4">
                  <ConfigField label="Label">
                    <Input
                      className="h-9"
                      onChange={(e) => onLabelChange?.(e.target.value)}
                      value={nodeLabel}
                    />
                  </ConfigField>

                  <ConfigField label="Description">
                    <Textarea
                      className="min-h-[80px] resize-y"
                      onChange={(e) =>
                        handleConfigChange({
                          description: e.target.value || undefined,
                        })
                      }
                      placeholder="Optional description..."
                      value={(nodeConfig.description as string) ?? ""}
                    />
                  </ConfigField>
                </div>
              </ConfigSection>

              {nodeSpecificConfig}

              {!nodeSpecificConfig && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No configuration options for this node type.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }
  )
);

ConfigPanelContent.displayName = "ConfigPanelContent";

export const ConfigPanel = memo(
  forwardRef<HTMLDivElement, ConfigPanelProps>(
    function ConfigPanelComponent(props, ref) {
      const {
        nodeId,
        nodeType,
        nodeLabel,
        nodeStatus,
        nodeConfig,
        onLabelChange,
        onConfigChange,
        onDelete,
        onDuplicate,
      } = props;

      const handleClose = useCallback(() => {
        if (!props.embedded && props.onOpenChange) {
          props.onOpenChange(false);
        } else if (props.embedded && props.onClose) {
          props.onClose();
        }
      }, [props]);

      if (props.embedded) {
        return (
          <ConfigPanelContent
            actionRegistries={props.actionRegistries}
            connectorLogos={props.connectorLogos}
            connectors={props.connectors}
            nodeConfig={nodeConfig}
            nodeId={nodeId}
            nodeLabel={nodeLabel}
            nodeStatus={nodeStatus}
            nodeType={nodeType}
            onClose={props.onClose}
            onConfigChange={onConfigChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onFetchResources={props.onFetchResources}
            onLabelChange={onLabelChange}
            ref={ref}
          />
        );
      }

      return (
        <Sheet onOpenChange={props.onOpenChange} open={props.open}>
          <SheetContent
            className="flex w-[360px] flex-col p-0"
            hideClose
            ref={ref}
            side="right"
          >
            <ConfigPanelContent
              actionRegistries={props.actionRegistries}
              connectorLogos={props.connectorLogos}
              connectors={props.connectors}
              nodeConfig={nodeConfig}
              nodeId={nodeId}
              nodeLabel={nodeLabel}
              nodeStatus={nodeStatus}
              nodeType={nodeType}
              onClose={handleClose}
              onConfigChange={onConfigChange}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onFetchResources={props.onFetchResources}
              onLabelChange={onLabelChange}
            />
          </SheetContent>
        </Sheet>
      );
    }
  )
);

ConfigPanel.displayName = "ConfigPanel";
