import type { NodeCategory } from "@openplane/types/canvas";
import type { ComponentType } from "react";
import { Icons } from "../../icons";

import { aiNodeTypes } from "./ai";
import { controlNodeTypes } from "./control";
import { DropNode } from "./drop-node";
import { humanNodeTypes } from "./human";
import { transformNodeTypes } from "./transform";

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

export const nodeRegistry: NodeRegistryEntry[] = [
  ...CONTROL_ENTRIES,
  ...AI_ENTRIES,
  ...TRANSFORM_ENTRIES,
  ...HUMAN_ENTRIES,
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

export function createAllNodeTypes() {
  return {
    ...controlNodeTypes,
    ...aiNodeTypes,
    ...transformNodeTypes,
    ...humanNodeTypes,
    drop: DropNode,
  } as const;
}
