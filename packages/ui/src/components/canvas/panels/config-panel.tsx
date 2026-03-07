"use client";

import type {
  AgentCallNodeConfig,
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
  DatabaseQueryNodeConfig,
  ExtractNodeConfig,
  FilterNodeConfig,
  GraphqlQueryNodeConfig,
  HttpRequestNodeConfig,
  ImageNodeConfig,
  InputNodeConfig,
  LlmNodeConfig,
  LoopNodeConfig,
  MemoryReadNodeConfig,
  MemorySearchNodeConfig,
  MemoryWriteNodeConfig,
  NodeStatus,
  NotifyNodeConfig,
  ParallelJoinNodeConfig,
  ParallelMapNodeConfig,
  ParallelSplitNodeConfig,
  RagNodeConfig,
  StartNodeConfig,
  SubWorkflowNodeConfig,
  SummarizeNodeConfig,
  TemplateNodeConfig,
  ToolNodeConfig,
  VideoNodeConfig,
} from "@openbeam/types/canvas";
import type { ConnectorType } from "@openbeam/types/services/connectors/events";
import type { ComponentType } from "react";
import { forwardRef, memo, useCallback } from "react";
import { Input } from "../../input";
import { ScrollArea } from "../../scroll-area";
import { Sheet, SheetContent } from "../../sheet";
import { Textarea } from "../../textarea";
import type { ConnectorInfo, LogoProps, ResourceInfo } from "../event-builder";
import type { ToolParameterDef, ToolPickerItem } from "../tool-elements";
import { ConfigField } from "./config-field";
import { ConfigPanelHeader } from "./config-panel-header";
import { ConfigSection } from "./config-section";
import {
  AgentCallConfigPanel,
  AnnotationConfigPanel,
  ApprovalConfigPanel,
  AudioConfigPanel,
  ClassifyConfigPanel,
  CodeConfigPanel,
  ConditionConfigPanel,
  ConnectorActionConfigPanel,
  ConnectorConfigPanel,
  DatabaseQueryConfigPanel,
  ExtractConfigPanel,
  FilterConfigPanel,
  GraphqlQueryConfigPanel,
  HttpRequestConfigPanel,
  ImageConfigPanel,
  InputConfigPanel,
  LlmConfigPanel,
  LoopConfigPanel,
  MemoryReadConfigPanel,
  MemorySearchConfigPanel,
  MemoryWriteConfigPanel,
  NotifyConfigPanel,
  ParallelJoinConfigPanel,
  ParallelMapConfigPanel,
  ParallelSplitConfigPanel,
  RagConfigPanel,
  StartConfigPanel,
  SubWorkflowConfigPanel,
  SummarizeConfigPanel,
  TemplateConfigPanel,
  ToolConfigPanel,
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
  availableTools?: ToolPickerItem[];
  toolParameters?: ToolParameterDef[];
  toolParametersLoading?: boolean;
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
        availableTools,
        toolParameters,
        toolParametersLoading,
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
          case "agent_call":
            return (
              <AgentCallConfigPanel
                config={nodeConfig as AgentCallNodeConfig}
                onChange={handleConfigChange}
              />
            );
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
          case "parallel_map":
            return (
              <ParallelMapConfigPanel
                config={nodeConfig as ParallelMapNodeConfig}
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
          case "sub_workflow":
            return (
              <SubWorkflowConfigPanel
                config={nodeConfig as SubWorkflowNodeConfig}
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
          case "graphql_query":
            return (
              <GraphqlQueryConfigPanel
                config={nodeConfig as GraphqlQueryNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "http_request":
            return (
              <HttpRequestConfigPanel
                config={nodeConfig as HttpRequestNodeConfig}
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
          case "database_query":
            return (
              <DatabaseQueryConfigPanel
                config={nodeConfig as DatabaseQueryNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "connector_action":
            return (
              <ConnectorActionConfigPanel
                actionRegistries={actionRegistries}
                config={nodeConfig as ConnectorActionNodeConfig}
                connectorLogos={connectorLogos}
                connectors={connectors}
                onChange={handleConfigChange}
                onFetchResources={onFetchResources}
              />
            );
          case "tool":
            return (
              <ToolConfigPanel
                availableTools={availableTools}
                config={nodeConfig as ToolNodeConfig}
                onChange={handleConfigChange}
                toolParameters={toolParameters}
                toolParametersLoading={toolParametersLoading}
              />
            );
          case "memory_read":
            return (
              <MemoryReadConfigPanel
                config={nodeConfig as MemoryReadNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "memory_write":
            return (
              <MemoryWriteConfigPanel
                config={nodeConfig as MemoryWriteNodeConfig}
                onChange={handleConfigChange}
              />
            );
          case "memory_search":
            return (
              <MemorySearchConfigPanel
                config={nodeConfig as MemorySearchNodeConfig}
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
            availableTools={props.availableTools}
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
            toolParameters={props.toolParameters}
            toolParametersLoading={props.toolParametersLoading}
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
              availableTools={props.availableTools}
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
              toolParameters={props.toolParameters}
              toolParametersLoading={props.toolParametersLoading}
            />
          </SheetContent>
        </Sheet>
      );
    }
  )
);

ConfigPanel.displayName = "ConfigPanel";
