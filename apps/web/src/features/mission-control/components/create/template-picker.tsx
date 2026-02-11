"use client";

import type { MissionTemplate } from "@openplane/types/mission-control";
import { Button, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";

const DEMO_TEMPLATES: MissionTemplate[] = [
  {
    id: "research",
    name: "Research Report",
    description: "Research a topic and produce a comprehensive report",
    vertical: "research",
    agents: [
      {
        name: "Research Lead",
        role: "coordinator",
        soulPrompt: "You lead research investigations.",
        tools: ["search_hybrid", "doc_get", "rag_answer"],
      },
      {
        name: "Fact Checker",
        role: "reviewer",
        soulPrompt: "You verify claims against sources.",
        tools: ["rag_verify", "search_semantic"],
      },
    ],
    tasks: [
      {
        title: "Gather sources",
        description: "Find relevant documents and data",
        priority: "P1",
      },
      {
        title: "Synthesize findings",
        description: "Produce structured report",
        priority: "P1",
      },
      {
        title: "Fact-check claims",
        description: "Verify all factual statements",
        priority: "P0",
      },
    ],
  },
  {
    id: "content",
    name: "Content Creation",
    description: "Create content with research and review",
    vertical: "content",
    agents: [
      {
        name: "Content Writer",
        role: "specialist",
        soulPrompt: "You write clear, engaging content.",
        tools: ["search_hybrid", "rag_answer"],
      },
      {
        name: "Editor",
        role: "reviewer",
        soulPrompt: "You review and refine written content.",
        tools: ["doc_get"],
      },
    ],
    tasks: [
      {
        title: "Research topic",
        description: "Gather background information",
        priority: "P1",
      },
      {
        title: "Write draft",
        description: "Produce initial content draft",
        priority: "P0",
      },
      {
        title: "Review and polish",
        description: "Edit for clarity and accuracy",
        priority: "P1",
      },
    ],
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Review codebase with multiple specialized agents",
    vertical: "engineering",
    agents: [
      {
        name: "Security Auditor",
        role: "specialist",
        soulPrompt: "You audit code for security vulnerabilities.",
        tools: ["search_hybrid", "doc_chunks"],
      },
      {
        name: "Performance Analyst",
        role: "specialist",
        soulPrompt: "You analyze code for performance issues.",
        tools: ["doc_get", "doc_chunks"],
      },
      {
        name: "Review Lead",
        role: "coordinator",
        soulPrompt: "You coordinate code review and produce summary.",
        tools: ["search_hybrid", "rag_answer"],
      },
    ],
    tasks: [
      {
        title: "Security scan",
        description: "Identify security vulnerabilities",
        priority: "P0",
      },
      {
        title: "Performance analysis",
        description: "Find performance bottlenecks",
        priority: "P1",
      },
      {
        title: "Compile review report",
        description: "Aggregate findings into actionable report",
        priority: "P1",
      },
    ],
  },
];

const templateCardVariants = cva(
  "flex cursor-pointer flex-col gap-2 rounded-md border p-3 text-left transition-colors",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5",
        false: "border-border/50 hover:border-border hover:bg-muted/30",
      },
    },
    defaultVariants: { selected: false },
  }
);

type TemplatePickerProps = {
  selectedId: string | null;
  onSelect: (template: MissionTemplate) => void;
  onStartFromScratch: () => void;
};

export function TemplatePicker({
  selectedId,
  onSelect,
  onStartFromScratch,
}: TemplatePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_TEMPLATES.map((template) => (
          <button
            className={templateCardVariants({
              selected: selectedId === template.id,
            })}
            key={template.id}
            onClick={() => onSelect(template)}
            type="button"
          >
            <span className="font-medium text-sm">{template.name}</span>
            <span className="line-clamp-2 text-muted-foreground text-xs">
              {template.description}
            </span>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icons.BotIcon size={12} />
                {template.agents.length} agents
              </span>
              <span className="flex items-center gap-1">
                <Icons.CheckCircle2 size={12} />
                {template.tasks.length} tasks
              </span>
            </div>
          </button>
        ))}
      </div>

      <Button
        className="self-start"
        onClick={onStartFromScratch}
        size="sm"
        variant="ghost"
      >
        <Icons.Plus size={14} />
        Start from Scratch
      </Button>
    </div>
  );
}

export { templateCardVariants, DEMO_TEMPLATES };
