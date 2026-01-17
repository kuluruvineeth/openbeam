"use client";

import type { CanvasNodeType } from "@openplane/types/canvas";
import {
  Bot,
  ChevronDown,
  CircleCheck,
  Code2,
  Copy,
  FileSearch,
  FileText,
  Filter,
  GitBranch,
  GitMerge,
  Hand,
  ListChecks,
  Play,
  Repeat,
  Split,
  Square,
  StickyNote,
  Tags,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { memo, useCallback, useState } from "react";
import { Button } from "../../../components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/collapsible";
import { Input } from "../../../components/input";
import { Label } from "../../../components/label";
import { ScrollArea } from "../../../components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/select";
import { Separator } from "../../../components/separator";
import { Slider } from "../../../components/slider";
import { Switch } from "../../../components/switch";
import { Textarea } from "../../../components/textarea";
import { cn } from "../../../utils";

const NODE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  start: Play,
  end: Square,
  condition: GitBranch,
  loop: Repeat,
  parallel_split: Split,
  parallel_join: GitMerge,
  llm: Bot,
  rag: FileSearch,
  summarize: FileText,
  extract: Tags,
  classify: Tags,
  filter: Filter,
  template: FileText,
  code: Code2,
  approval: CircleCheck,
  input: Hand,
  annotation: StickyNote,
  connector: Zap,
  tool: ListChecks,
};

interface ConfigSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const ConfigSection = memo(function ConfigSectionComponent({
  title,
  defaultOpen = true,
  children,
}: ConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:text-primary">
        {title}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
});

interface ConfigFieldProps {
  label: string;
  description?: string;
  children: ReactNode;
}

const ConfigField = memo(function ConfigFieldComponent({
  label,
  description,
  children,
}: ConfigFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
});

interface ConfigPanelHeaderProps {
  nodeType: CanvasNodeType;
  nodeLabel: string;
  onClose?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const ConfigPanelHeader = memo(function ConfigPanelHeaderComponent({
  nodeType,
  nodeLabel,
  onClose,
  onDelete,
  onDuplicate,
}: ConfigPanelHeaderProps) {
  const Icon = NODE_ICONS[nodeType] ?? Square;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{nodeLabel}</h3>
          <p className="text-muted-foreground text-xs capitalize">
            {nodeType.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Duplicate node"
          onClick={onDuplicate}
          size="icon"
          variant="ghost"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Delete node"
          onClick={onDelete}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Close panel"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

interface LlmConfigProps {
  config: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: string;
  };
  onChange: (key: string, value: unknown) => void;
}

const LlmConfig = memo(function LlmConfigComponent({
  config,
  onChange,
}: LlmConfigProps) {
  return (
    <>
      <ConfigSection title="Model Settings">
        <ConfigField description="Select the AI model to use" label="Model">
          <Select
            onValueChange={(value) => onChange("model", value)}
            value={config.model ?? ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="claude-sonnet-4-20250514">
                Claude Sonnet 4
              </SelectItem>
              <SelectItem value="claude-opus-4-20250514">
                Claude Opus 4
              </SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
        <ConfigField
          description="0 = deterministic, 2 = creative"
          label="Temperature"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={2}
              min={0}
              onValueChange={([value]) => onChange("temperature", value)}
              step={0.1}
              value={[config.temperature ?? 0.7]}
            />
            <span className="w-12 text-right text-muted-foreground text-sm">
              {config.temperature ?? 0.7}
            </span>
          </div>
        </ConfigField>
        <ConfigField description="Maximum response length" label="Max Tokens">
          <Input
            onChange={(e) => onChange("maxTokens", Number(e.target.value))}
            type="number"
            value={config.maxTokens ?? 4096}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="Prompts">
        <ConfigField
          description="Instructions for the model's behavior"
          label="System Prompt"
        >
          <Textarea
            className="min-h-[100px]"
            onChange={(e) => onChange("systemPrompt", e.target.value)}
            placeholder="You are a helpful assistant..."
            value={config.systemPrompt ?? ""}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection defaultOpen={false} title="Output">
        <ConfigField label="Response Format">
          <Select
            onValueChange={(value) => onChange("responseFormat", value)}
            value={config.responseFormat ?? "text"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="structured">Structured</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
      </ConfigSection>
    </>
  );
});

interface RagConfigProps {
  config: {
    searchType?: string;
    topK?: number;
    rerank?: boolean;
    minScore?: number;
  };
  onChange: (key: string, value: unknown) => void;
}

const RagConfig = memo(function RagConfigComponent({
  config,
  onChange,
}: RagConfigProps) {
  return (
    <>
      <ConfigSection title="Search Settings">
        <ConfigField label="Search Type">
          <Select
            onValueChange={(value) => onChange("searchType", value)}
            value={config.searchType ?? "hybrid"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="semantic">Semantic</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
        <ConfigField description="Number of results to retrieve" label="Top K">
          <Input
            onChange={(e) => onChange("topK", Number(e.target.value))}
            type="number"
            value={config.topK ?? 10}
          />
        </ConfigField>
        <ConfigField description="Minimum relevance score" label="Min Score">
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={1}
              min={0}
              onValueChange={([value]) => onChange("minScore", value)}
              step={0.05}
              value={[config.minScore ?? 0.5]}
            />
            <span className="w-12 text-right text-muted-foreground text-sm">
              {config.minScore ?? 0.5}
            </span>
          </div>
        </ConfigField>
      </ConfigSection>

      <ConfigSection defaultOpen={false} title="Advanced">
        <ConfigField label="Rerank Results">
          <Switch
            checked={config.rerank ?? true}
            onCheckedChange={(checked) => onChange("rerank", checked)}
          />
        </ConfigField>
      </ConfigSection>
    </>
  );
});

interface ConditionConfigProps {
  config: {
    expression?: string;
    defaultBranch?: string;
  };
  onChange: (key: string, value: unknown) => void;
}

const ConditionConfig = memo(function ConditionConfigComponent({
  config,
  onChange,
}: ConditionConfigProps) {
  return (
    <ConfigSection title="Condition Settings">
      <ConfigField
        description="JavaScript expression that evaluates to boolean"
        label="Expression"
      >
        <Textarea
          className="font-mono text-sm"
          onChange={(e) => onChange("expression", e.target.value)}
          placeholder="input.value > 100"
          value={config.expression ?? ""}
        />
      </ConfigField>
      <ConfigField label="Default Branch">
        <Input
          onChange={(e) => onChange("defaultBranch", e.target.value)}
          placeholder="else"
          value={config.defaultBranch ?? ""}
        />
      </ConfigField>
    </ConfigSection>
  );
});

interface LoopConfigProps {
  config: {
    type?: string;
    collection?: string;
    condition?: string;
    times?: number;
    maxIterations?: number;
  };
  onChange: (key: string, value: unknown) => void;
}

const LoopConfig = memo(function LoopConfigComponent({
  config,
  onChange,
}: LoopConfigProps) {
  return (
    <>
      <ConfigSection title="Loop Settings">
        <ConfigField label="Loop Type">
          <Select
            onValueChange={(value) => onChange("type", value)}
            value={config.type ?? "forEach"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="forEach">For Each</SelectItem>
              <SelectItem value="while">While</SelectItem>
              <SelectItem value="times">Times</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>

        {config.type === "forEach" && (
          <ConfigField description="Path to the collection" label="Collection">
            <Input
              onChange={(e) => onChange("collection", e.target.value)}
              placeholder="input.items"
              value={config.collection ?? ""}
            />
          </ConfigField>
        )}

        {config.type === "while" && (
          <ConfigField label="Condition">
            <Textarea
              className="font-mono text-sm"
              onChange={(e) => onChange("condition", e.target.value)}
              placeholder="index < 10"
              value={config.condition ?? ""}
            />
          </ConfigField>
        )}

        {config.type === "times" && (
          <ConfigField label="Number of Iterations">
            <Input
              onChange={(e) => onChange("times", Number(e.target.value))}
              type="number"
              value={config.times ?? 1}
            />
          </ConfigField>
        )}
      </ConfigSection>

      <ConfigSection defaultOpen={false} title="Safety">
        <ConfigField
          description="Maximum iterations allowed"
          label="Max Iterations"
        >
          <Input
            onChange={(e) => onChange("maxIterations", Number(e.target.value))}
            type="number"
            value={config.maxIterations ?? 100}
          />
        </ConfigField>
      </ConfigSection>
    </>
  );
});

interface CodeConfigProps {
  config: {
    code?: string;
    runtime?: string;
    timeoutMs?: number;
  };
  onChange: (key: string, value: unknown) => void;
}

const CodeConfig = memo(function CodeConfigComponent({
  config,
  onChange,
}: CodeConfigProps) {
  return (
    <>
      <ConfigSection title="Code Settings">
        <ConfigField label="Runtime">
          <Select
            onValueChange={(value) => onChange("runtime", value)}
            value={config.runtime ?? "javascript"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
        <ConfigField label="Code">
          <Textarea
            className="min-h-[200px] font-mono text-sm"
            onChange={(e) => onChange("code", e.target.value)}
            placeholder="// Your code here"
            value={config.code ?? ""}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection defaultOpen={false} title="Execution">
        <ConfigField description="Maximum execution time" label="Timeout (ms)">
          <Input
            onChange={(e) => onChange("timeoutMs", Number(e.target.value))}
            type="number"
            value={config.timeoutMs ?? 30_000}
          />
        </ConfigField>
      </ConfigSection>
    </>
  );
});

interface ApprovalConfigProps {
  config: {
    message?: string;
    autoApprove?: boolean;
    timeoutMs?: number;
  };
  onChange: (key: string, value: unknown) => void;
}

const ApprovalConfig = memo(function ApprovalConfigComponent({
  config,
  onChange,
}: ApprovalConfigProps) {
  return (
    <ConfigSection title="Approval Settings">
      <ConfigField label="Message">
        <Textarea
          className="min-h-[80px]"
          onChange={(e) => onChange("message", e.target.value)}
          placeholder="Please review and approve..."
          value={config.message ?? ""}
        />
      </ConfigField>
      <ConfigField label="Auto Approve">
        <Switch
          checked={config.autoApprove ?? false}
          onCheckedChange={(checked) => onChange("autoApprove", checked)}
        />
      </ConfigField>
      <ConfigField description="0 = no timeout" label="Timeout (ms)">
        <Input
          onChange={(e) => onChange("timeoutMs", Number(e.target.value))}
          type="number"
          value={config.timeoutMs ?? 0}
        />
      </ConfigField>
    </ConfigSection>
  );
});

export interface ConfigPanelProps {
  className?: string;
  nodeId: string;
  nodeType: CanvasNodeType;
  nodeLabel: string;
  nodeConfig: Record<string, unknown>;
  onClose?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onConfigChange?: (nodeId: string, config: Record<string, unknown>) => void;
}

export const ConfigPanel = memo(function ConfigPanelComponent({
  className,
  nodeId,
  nodeType,
  nodeLabel,
  nodeConfig,
  onClose,
  onDelete,
  onDuplicate,
  onConfigChange,
}: ConfigPanelProps) {
  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onConfigChange?.(nodeId, { ...nodeConfig, [key]: value });
    },
    [nodeId, nodeConfig, onConfigChange]
  );

  const renderConfig = () => {
    switch (nodeType) {
      case "llm":
        return <LlmConfig config={nodeConfig} onChange={handleChange} />;
      case "rag":
        return <RagConfig config={nodeConfig} onChange={handleChange} />;
      case "condition":
        return <ConditionConfig config={nodeConfig} onChange={handleChange} />;
      case "loop":
        return <LoopConfig config={nodeConfig} onChange={handleChange} />;
      case "code":
        return <CodeConfig config={nodeConfig} onChange={handleChange} />;
      case "approval":
        return <ApprovalConfig config={nodeConfig} onChange={handleChange} />;
      default:
        return (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No configuration options available for this node type.
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex h-full w-80 flex-col border-l bg-background",
        className
      )}
    >
      <ConfigPanelHeader
        nodeLabel={nodeLabel}
        nodeType={nodeType}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          <ConfigSection title="General">
            <ConfigField label="Label">
              <Input
                onChange={(e) => handleChange("label", e.target.value)}
                value={nodeLabel}
              />
            </ConfigField>
            <ConfigField label="Description">
              <Textarea
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional description..."
                value={(nodeConfig.description as string) ?? ""}
              />
            </ConfigField>
          </ConfigSection>

          <Separator />

          {renderConfig()}
        </div>
      </ScrollArea>
    </div>
  );
});
ConfigPanel.displayName = "ConfigPanel";
