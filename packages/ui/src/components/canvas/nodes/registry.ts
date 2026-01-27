import type { NodeCategory } from "@openplane/types/canvas";
import type { ComponentType } from "react";
import { Icons } from "../../icons";

import { aiNodeTypes } from "./ai";
import { controlNodeTypes } from "./control";
import { humanNodeTypes } from "./human";
import { integrationNodeTypes } from "./integration";
import { memoryNodeTypes } from "./memory";
import { orchestrationNodeTypes } from "./orchestration";
import { transformNodeTypes } from "./transform";
import { triggerNodeTypes } from "./trigger";

export interface NodeRegistryEntry {
  id: string;
  label: string;
  description: string;
  icon: (typeof Icons)[keyof typeof Icons];
  category: NodeCategory;
  // biome-ignore lint/suspicious/noExplicitAny: Registry holds heterogeneous node types
  component: ComponentType<any>;
}

const CONTROL_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "start",
    label: "Start",
    description: "Entry point for the workflow",
    icon: Icons.Play,
    category: "control",
    component: controlNodeTypes.start,
  },
  {
    id: "end",
    label: "End",
    description: "Exit point for the workflow",
    icon: Icons.SquareIcon,
    category: "control",
    component: controlNodeTypes.end,
  },
  {
    id: "condition",
    label: "Condition",
    description: "Branch based on conditions",
    icon: Icons.GitBranch,
    category: "control",
    component: controlNodeTypes.condition,
  },
  {
    id: "loop",
    label: "Loop",
    description: "Repeat actions",
    icon: Icons.Repeat,
    category: "control",
    component: controlNodeTypes.loop,
  },
  {
    id: "parallel_split",
    label: "Parallel Split",
    description: "Split into parallel branches",
    icon: Icons.GitBranch,
    category: "control",
    component: controlNodeTypes.parallel_split,
  },
  {
    id: "parallel_join",
    label: "Parallel Join",
    description: "Join parallel branches",
    icon: Icons.GitMerge,
    category: "control",
    component: controlNodeTypes.parallel_join,
  },
];

const AI_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "llm",
    label: "LLM",
    description: "Call a language model",
    icon: Icons.BotIcon,
    category: "ai",
    component: aiNodeTypes.llm,
  },
  {
    id: "rag",
    label: "RAG",
    description: "Retrieval augmented generation",
    icon: Icons.SearchIcon,
    category: "ai",
    component: aiNodeTypes.rag,
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Summarize text content",
    icon: Icons.FileTextIcon,
    category: "ai",
    component: aiNodeTypes.summarize,
  },
  {
    id: "extract",
    label: "Extract",
    description: "Extract structured data",
    icon: Icons.SearchIcon,
    category: "ai",
    component: aiNodeTypes.extract,
  },
  {
    id: "classify",
    label: "Classify",
    description: "Classify into categories",
    icon: Icons.Tags,
    category: "ai",
    component: aiNodeTypes.classify,
  },
];

const TRANSFORM_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "template",
    label: "Template",
    description: "Apply text template",
    icon: Icons.MessageSquare,
    category: "transform",
    component: transformNodeTypes.template,
  },
  {
    id: "code",
    label: "Code",
    description: "Execute custom code",
    icon: Icons.Code,
    category: "transform",
    component: transformNodeTypes.code,
  },
  {
    id: "filter",
    label: "Filter",
    description: "Filter data",
    icon: Icons.Filter,
    category: "transform",
    component: transformNodeTypes.filter,
  },
];

const HUMAN_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "approval",
    label: "Approval",
    description: "Request human approval",
    icon: Icons.CheckCircle2,
    category: "human",
    component: humanNodeTypes.approval,
  },
  {
    id: "input",
    label: "Input",
    description: "Request user input",
    icon: Icons.Hand,
    category: "human",
    component: humanNodeTypes.input,
  },
  {
    id: "annotation",
    label: "Annotation",
    description: "Add notes to canvas",
    icon: Icons.Note,
    category: "human",
    component: humanNodeTypes.annotation,
  },
  {
    id: "notify",
    label: "Notify",
    description: "Send notification",
    icon: Icons.Message,
    category: "human",
    component: humanNodeTypes.notify,
  },
];

const INTEGRATION_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "connector",
    label: "Connector",
    description: "Connect to external service",
    icon: Icons.Plug,
    category: "integration",
    component: integrationNodeTypes.connector,
  },
  {
    id: "http_request",
    label: "HTTP Request",
    description: "Make HTTP API call",
    icon: Icons.GlobeIcon,
    category: "integration",
    component: integrationNodeTypes.http_request,
  },
  {
    id: "database_query",
    label: "Database Query",
    description: "Query database",
    icon: Icons.Database,
    category: "integration",
    component: integrationNodeTypes.database_query,
  },
  {
    id: "graphql_query",
    label: "GraphQL Query",
    description: "Execute GraphQL query",
    icon: Icons.Braces,
    category: "integration",
    component: integrationNodeTypes.graphql_query,
  },
  {
    id: "tool",
    label: "Tool",
    description: "Execute AI tool",
    icon: Icons.Wrench,
    category: "integration",
    component: integrationNodeTypes.tool,
  },
  {
    id: "connector_action",
    label: "Connector Action",
    description: "Execute connector action (Slack, Gmail, etc.)",
    icon: Icons.Zap,
    category: "integration",
    component: integrationNodeTypes.connector_action,
  },
];

const TRIGGER_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "trigger_manual",
    label: "Manual Trigger",
    description: "Manually start workflow",
    icon: Icons.Hand,
    category: "trigger",
    component: triggerNodeTypes.trigger_manual,
  },
  {
    id: "trigger_schedule",
    label: "Schedule Trigger",
    description: "Run on schedule",
    icon: Icons.Clock,
    category: "trigger",
    component: triggerNodeTypes.trigger_schedule,
  },
  {
    id: "trigger_webhook",
    label: "Webhook Trigger",
    description: "Trigger via webhook",
    icon: Icons.Webhook,
    category: "trigger",
    component: triggerNodeTypes.trigger_webhook,
  },
  {
    id: "trigger_event",
    label: "Event Trigger",
    description: "Trigger on event",
    icon: Icons.Zap,
    category: "trigger",
    component: triggerNodeTypes.trigger_event,
  },
];

const MEMORY_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "memory_read",
    label: "Memory Read",
    description: "Read from memory",
    icon: Icons.Download,
    category: "memory",
    component: memoryNodeTypes.memory_read,
  },
  {
    id: "memory_write",
    label: "Memory Write",
    description: "Write to memory",
    icon: Icons.Upload,
    category: "memory",
    component: memoryNodeTypes.memory_write,
  },
  {
    id: "memory_search",
    label: "Memory Search",
    description: "Search memory",
    icon: Icons.SearchIcon,
    category: "memory",
    component: memoryNodeTypes.memory_search,
  },
];

const ORCHESTRATION_ENTRIES: NodeRegistryEntry[] = [
  {
    id: "sub_workflow",
    label: "Sub-Workflow",
    description: "Execute sub-workflow",
    icon: Icons.Workflow,
    category: "orchestration",
    component: orchestrationNodeTypes.sub_workflow,
  },
  {
    id: "agent_call",
    label: "Agent Call",
    description: "Call AI agent",
    icon: Icons.BotIcon,
    category: "orchestration",
    component: orchestrationNodeTypes.agent_call,
  },
  {
    id: "parallel_map",
    label: "Parallel Map",
    description: "Process items in parallel",
    icon: Icons.GitFork,
    category: "orchestration",
    component: orchestrationNodeTypes.parallel_map,
  },
];

export const nodeRegistry: NodeRegistryEntry[] = [
  ...CONTROL_ENTRIES,
  ...AI_ENTRIES,
  ...TRANSFORM_ENTRIES,
  ...HUMAN_ENTRIES,
  ...INTEGRATION_ENTRIES,
  ...TRIGGER_ENTRIES,
  ...MEMORY_ENTRIES,
  ...ORCHESTRATION_ENTRIES,
];

export const nodeRegistryMap = new Map<string, NodeRegistryEntry>(
  nodeRegistry.map((entry) => [entry.id, entry])
);

export function getNodeEntry(id: string): NodeRegistryEntry | undefined {
  return nodeRegistryMap.get(id);
}

export function getNodesByCategory(
  category: NodeCategory
): NodeRegistryEntry[] {
  return nodeRegistry.filter((entry) => entry.category === category);
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  control: "Control Flow",
  ai: "AI Processing",
  transform: "Transform",
  human: "Human",
  integration: "Integration",
  trigger: "Trigger",
  memory: "Memory",
  orchestration: "Orchestration",
};
