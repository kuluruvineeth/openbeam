import { Icons } from "../../icons";

interface NodeButton {
  id: string;
  label: string;
  description: string;
  icon: (typeof Icons)[keyof typeof Icons];
  category: "control" | "ai" | "transform" | "human";
}

export const nodeButtons: NodeButton[] = [
  {
    id: "start",
    label: "Start",
    description: "Entry point for the workflow",
    icon: Icons.Play,
    category: "control",
  },
  {
    id: "end",
    label: "End",
    description: "Exit point for the workflow",
    icon: Icons.SquareIcon,
    category: "control",
  },
  {
    id: "condition",
    label: "Condition",
    description: "Branch based on conditions",
    icon: Icons.GitBranch,
    category: "control",
  },
  {
    id: "loop",
    label: "Loop",
    description: "Repeat actions",
    icon: Icons.Repeat,
    category: "control",
  },
  {
    id: "parallel_split",
    label: "Parallel Split",
    description: "Split into parallel branches",
    icon: Icons.GitBranch,
    category: "control",
  },
  {
    id: "parallel_join",
    label: "Parallel Join",
    description: "Join parallel branches",
    icon: Icons.GitMerge,
    category: "control",
  },
  {
    id: "llm",
    label: "LLM",
    description: "Call a language model",
    icon: Icons.BotIcon,
    category: "ai",
  },
  {
    id: "rag",
    label: "RAG",
    description: "Retrieval augmented generation",
    icon: Icons.SearchIcon,
    category: "ai",
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Summarize text content",
    icon: Icons.FileTextIcon,
    category: "ai",
  },
  {
    id: "extract",
    label: "Extract",
    description: "Extract structured data",
    icon: Icons.SearchIcon,
    category: "ai",
  },
  {
    id: "classify",
    label: "Classify",
    description: "Classify into categories",
    icon: Icons.Tags,
    category: "ai",
  },
  {
    id: "template",
    label: "Template",
    description: "Apply text template",
    icon: Icons.MessageSquare,
    category: "transform",
  },
  {
    id: "code",
    label: "Code",
    description: "Execute custom code",
    icon: Icons.Code,
    category: "transform",
  },
  {
    id: "filter",
    label: "Filter",
    description: "Filter data",
    icon: Icons.Filter,
    category: "transform",
  },
  {
    id: "approval",
    label: "Approval",
    description: "Request human approval",
    icon: Icons.CheckCircle2,
    category: "human",
  },
  {
    id: "input",
    label: "Input",
    description: "Request user input",
    icon: Icons.Hand,
    category: "human",
  },
  {
    id: "annotation",
    label: "Annotation",
    description: "Add notes to canvas",
    icon: Icons.Note,
    category: "human",
  },
  {
    id: "notify",
    label: "Notify",
    description: "Send notification",
    icon: Icons.Message,
    category: "human",
  },
];

export const categoryLabels: Record<NodeButton["category"], string> = {
  control: "Control Flow",
  ai: "AI Processing",
  transform: "Transform",
  human: "Human",
};
