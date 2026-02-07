"use client";

import { DEFAULT_CHAT_MODEL, getChatModel } from "@openplane/types/ai";
import type {
  EntityType,
  ExtractedValue,
  ExtractionField,
  ExtractionMode,
  ExtractionResult,
  ExtractNodeConfig,
  NerEntity,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { cn } from "../../../../utils";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import {
  CostIndicator,
  NodeToolbar,
  StreamingResponse,
} from "../../ai-elements";
import { TEMPLATE_DEFINITIONS } from "../../ai-elements/extraction-template-selector";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ExtractNodeData {
  label: string;
  config: ExtractNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  streamingContent?: string;
  result?: ExtractionResult;
  error?: string;
  [key: string]: unknown;
}

type ExtractNodeType = Node<ExtractNodeData, "extract">;

export interface ExtractNodeProps extends NodeProps<ExtractNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onCopy?: (content: string) => void;
}

const MODE_CONFIG: Record<
  ExtractionMode,
  { label: string; icon: typeof Icons.ListTree; color: string }
> = {
  schema: {
    label: "Schema",
    icon: Icons.ListTree,
    color: "text-blue-500",
  },
  template: {
    label: "Template",
    icon: Icons.FileText,
    color: "text-violet-500",
  },
  example: {
    label: "Example",
    icon: Icons.Code,
    color: "text-emerald-500",
  },
  natural: {
    label: "Natural",
    icon: Icons.MessageSquare,
    color: "text-amber-500",
  },
};

interface ModeBadgeProps {
  isRunning?: boolean;
  mode: ExtractionMode;
}

function ModeBadge({ isRunning, mode }: ModeBadgeProps) {
  if (isRunning) {
    return (
      <span className="flex items-center gap-1 text-amber-500 text-xs">
        <Icons.Zap className="animate-pulse" size={12} />
        Extracting
      </span>
    );
  }
  const modeInfo = MODE_CONFIG[mode];
  const ModeIcon = modeInfo.icon;
  return (
    <span className={cn("flex items-center gap-1 text-xs", modeInfo.color)}>
      <ModeIcon size={12} />
      {modeInfo.label}
    </span>
  );
}

interface FieldsBadgesProps {
  fields: ExtractionField[];
}

function FieldsBadges({ fields }: FieldsBadgesProps) {
  if (fields.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {fields.slice(0, 4).map((field) => (
        <Badge
          className="px-1.5 py-0 text-[10px]"
          key={field.id}
          variant="secondary"
        >
          {field.name}
        </Badge>
      ))}
      {fields.length > 4 && (
        <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
          +{fields.length - 4}
        </Badge>
      )}
    </div>
  );
}

interface EntityTypesBadgesProps {
  types: EntityType[];
}

function EntityTypesBadges({ types }: EntityTypesBadgesProps) {
  if (types.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1.5">
      <Icons.Tags className="size-3 text-muted-foreground" />
      <span className="text-muted-foreground text-xs">
        NER: {types.slice(0, 3).join(", ")}
        {types.length > 3 && ` +${types.length - 3}`}
      </span>
    </div>
  );
}

interface ExtractedValuesListProps {
  values: ExtractedValue[];
}

function ExtractedValuesList({ values }: ExtractedValuesListProps) {
  if (values.length === 0) {
    return null;
  }
  return (
    <NodeSection className="border-border/30 border-t">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Extracted</span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {values.slice(0, 6).map((val) => (
            <div className="flex items-baseline gap-1 text-xs" key={val.field}>
              <span className="font-medium text-foreground/70">
                {val.field}:
              </span>
              <span className="truncate text-foreground/90">
                {formatValue(val.value)}
              </span>
            </div>
          ))}
        </div>
        {values.length > 6 && (
          <span className="text-[10px] text-muted-foreground">
            +{values.length - 6} more fields
          </span>
        )}
      </div>
    </NodeSection>
  );
}

interface ExtractedEntitiesListProps {
  entities: NerEntity[];
}

function ExtractedEntitiesList({ entities }: ExtractedEntitiesListProps) {
  if (entities.length === 0) {
    return null;
  }

  const grouped = entities.reduce(
    (acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity);
      return acc;
    },
    {} as Record<EntityType, NerEntity[]>
  );

  return (
    <NodeSection className="border-border/30 border-t">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Entities</span>
        <div className="flex flex-wrap gap-1">
          {Object.entries(grouped)
            .slice(0, 3)
            .map(([type, items]) => (
              <Badge
                className="px-1.5 py-0 text-[10px]"
                key={type}
                variant="outline"
              >
                {type}: {items.length}
              </Badge>
            ))}
          {Object.keys(grouped).length > 3 && (
            <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
              +{Object.keys(grouped).length - 3} types
            </Badge>
          )}
        </div>
      </div>
    </NodeSection>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return "{...}";
  }
  return String(value);
}

interface NodeInfoSectionProps {
  activeFields: ExtractionField[];
  config: ExtractNodeConfig;
  mode: ExtractionMode;
  modelLabel: string;
  notes: string[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    estimatedCost: number;
  } | null;
  warnings: string[];
}

function NodeInfoSection({
  activeFields,
  config,
  mode,
  modelLabel,
  notes,
  tokenUsage,
  warnings,
}: NodeInfoSectionProps) {
  const hasNer = config.extractEntities && config.entityTypes?.length;
  const hasAllEntities =
    config.extractEntities && (config.entityTypes?.length ?? 0) === 0;
  const showNaturalPrompt = mode === "natural" && config.extractionPrompt;

  return (
    <NodeSection>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <NodeField label="Model" value={modelLabel} />
          {tokenUsage && <CostIndicator compact usage={tokenUsage} />}
        </div>

        <FieldsBadges fields={activeFields} />

        {hasNer && <EntityTypesBadges types={config.entityTypes ?? []} />}
        {hasAllEntities && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Icons.Tags className="size-3" />
            <span>NER: all entity types</span>
          </div>
        )}

        {showNaturalPrompt && (
          <p className="truncate text-muted-foreground/70 text-xs">
            {config.extractionPrompt?.slice(0, 50)}...
          </p>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((warning) => (
              <div
                className="flex items-center gap-1.5 text-[10px] text-warning"
                key={warning}
              >
                <Icons.AlertCircle size={12} />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="space-y-1">
            {notes.map((note) => (
              <div
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                key={note}
              >
                <Icons.Info size={12} />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeSection>
  );
}

interface NodeToolbarWrapperProps {
  hasContent: boolean;
  isRunning?: boolean;
  onCopy: () => void;
  onRun: () => void;
  onStop: () => void;
}

function NodeToolbarWrapper({
  hasContent,
  isRunning,
  onCopy,
  onRun,
  onStop,
}: NodeToolbarWrapperProps) {
  return (
    <NodeSection className="border-border/30 border-t py-1">
      <NodeToolbar
        hasContent={hasContent}
        isRunning={isRunning}
        onCopy={onCopy}
        onRegenerate={onRun}
        onRun={onRun}
        onStop={onStop}
        position="inline"
      />
    </NodeSection>
  );
}

function getSubtitle(config: ExtractNodeConfig): string {
  const mode = config.mode ?? "schema";

  switch (mode) {
    case "schema": {
      const count = config.fields?.length ?? 0;
      return `${count} field${count !== 1 ? "s" : ""} defined`;
    }
    case "template": {
      if (config.template) {
        const template = TEMPLATE_DEFINITIONS.find(
          (t) => t.id === config.template
        );
        return template?.name ?? config.template;
      }
      return "No template selected";
    }
    case "example":
      return config.inferredSchema?.length
        ? `${config.inferredSchema.length} fields inferred`
        : "From JSON example";
    case "natural":
      return "Natural language";
    default:
      return "Extraction";
  }
}

function getActiveFields(config: ExtractNodeConfig): ExtractionField[] {
  const mode = config.mode ?? "schema";

  switch (mode) {
    case "schema":
      return config.fields ?? [];
    case "template": {
      if (config.customTemplate?.fields?.length) {
        return config.customTemplate.fields;
      }
      if (config.fields?.length) {
        return config.fields;
      }
      if (config.template) {
        const template = TEMPLATE_DEFINITIONS.find(
          (t) => t.id === config.template
        );
        return template?.fields ?? [];
      }
      return [];
    }
    case "example":
      return config.inferredSchema ?? [];
    case "natural":
      return [];
    default:
      return [];
  }
}

function hasIncompleteFields(fields: ExtractionField[]): boolean {
  return fields.some((field) => !(field.name.trim() && field.id.trim()));
}

export const ExtractNode = memo(
  forwardRef<HTMLDivElement, ExtractNodeProps>(function ExtractNodeComponent(
    { id, data, selected, onRun, onStop, onCopy },
    ref
  ) {
    const mode = data.config.mode ?? "schema";
    const activeFields = useMemo(
      () => getActiveFields(data.config),
      [data.config]
    );
    const subtitle = useMemo(() => getSubtitle(data.config), [data.config]);
    const modelId = data.config.model?.trim() || DEFAULT_CHAT_MODEL;
    const modelMeta = getChatModel(modelId);
    const modelLabel = modelMeta?.name ?? modelId;

    const hasContent = Boolean(data.result || data.streamingContent);

    const tokenUsage = useMemo(() => {
      const usage = data.result?.usage;
      if (!usage) {
        return null;
      }
      return {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.inputTokens + usage.outputTokens,
        estimatedCost: 0,
      };
    }, [data.result?.usage]);

    const handleRun = useCallback(() => onRun?.(id), [id, onRun]);
    const handleStop = useCallback(() => onStop?.(id), [id, onStop]);
    const handleCopy = useCallback(() => {
      if (data.result?.values) {
        onCopy?.(JSON.stringify(data.result.values, null, 2));
      }
    }, [data.result?.values, onCopy]);

    const showStreaming =
      data.isRunning || (hasContent && data.streamingContent);
    const values = data.result?.values ?? [];
    const entities = data.result?.entities ?? [];

    const warnings = useMemo(() => {
      const items: string[] = [];
      if (mode === "schema") {
        if ((data.config.fields?.length ?? 0) === 0) {
          items.push("Add at least one field");
        }
        if (hasIncompleteFields(data.config.fields ?? [])) {
          items.push("Fill in field names");
        }
      }
      if (mode === "template") {
        const hasTemplate = Boolean(data.config.template);
        const hasCustomFields =
          (data.config.customTemplate?.fields?.length ?? 0) > 0;
        const hasFields = (data.config.fields?.length ?? 0) > 0;
        if (!(hasTemplate || hasCustomFields || hasFields)) {
          items.push("Select a template or add custom fields");
        }
        if (activeFields.length > 0 && hasIncompleteFields(activeFields)) {
          items.push("Fill in field names");
        }
      }
      if (mode === "example") {
        if (!data.config.jsonExample?.trim()) {
          items.push("Provide a JSON example");
        } else if ((data.config.inferredSchema?.length ?? 0) === 0) {
          items.push("No fields inferred");
        }
      }
      if (mode === "natural" && !data.config.extractionPrompt?.trim()) {
        items.push("Describe what to extract");
      }
      return items;
    }, [
      activeFields,
      data.config.customTemplate?.fields?.length,
      data.config.extractionPrompt,
      data.config.fields,
      data.config.inferredSchema?.length,
      data.config.jsonExample,
      data.config.template,
      mode,
    ]);

    const notes = useMemo(() => {
      const items: string[] = [];
      if (data.config.customTemplate?.fields?.length) {
        items.push("Custom fields override template defaults");
      }
      if (
        data.config.extractEntities &&
        (data.config.entityTypes?.length ?? 0) === 0
      ) {
        items.push("NER includes all entity types");
      }
      if (!data.config.strictMode) {
        items.push("Raw output is retained");
      }
      if (data.config.includeConfidence) {
        items.push("Confidence scores included");
      }
      return items;
    }, [
      data.config.customTemplate?.fields?.length,
      data.config.entityTypes?.length,
      data.config.extractEntities,
      data.config.includeConfidence,
      data.config.strictMode,
    ]);

    return (
      <NodeShell
        handles={[
          { type: "target", position: Position.Left },
          { type: "source", position: Position.Right },
        ]}
        ref={ref}
        selected={selected}
        status={data.status}
      >
        <NodeHeader
          badge={<ModeBadge isRunning={data.isRunning} mode={mode} />}
          colorVar="--node-extract"
          icon={<Icons.Scissors size={20} />}
          subtitle={subtitle}
          title={data.label}
        />

        <NodeInfoSection
          activeFields={activeFields}
          config={data.config}
          mode={mode}
          modelLabel={modelLabel}
          notes={notes}
          tokenUsage={tokenUsage}
          warnings={warnings}
        />

        {showStreaming && (
          <NodeSection className="border-border/30 border-t">
            <StreamingResponse
              content={data.streamingContent ?? ""}
              error={data.error}
              isStreaming={data.isRunning && Boolean(data.streamingContent)}
              onCopy={handleCopy}
              size="sm"
            />
          </NodeSection>
        )}

        {values.length > 0 && <ExtractedValuesList values={values} />}
        {entities.length > 0 && <ExtractedEntitiesList entities={entities} />}

        {selected && (
          <NodeToolbarWrapper
            hasContent={hasContent}
            isRunning={data.isRunning}
            onCopy={handleCopy}
            onRun={handleRun}
            onStop={handleStop}
          />
        )}
      </NodeShell>
    );
  })
);

ExtractNode.displayName = "ExtractNode";

export function createExtractNodeData(): ExtractNodeData {
  return {
    label: "Extract",
    config: {
      mode: "schema",
      fields: [],
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.1,
      strictMode: true,
      includeConfidence: false,
      handleArrays: "all",
      nullHandling: "omit",
      extractEntities: false,
    },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "extracted", label: "Extracted", type: "data", required: true },
    ],
  };
}
