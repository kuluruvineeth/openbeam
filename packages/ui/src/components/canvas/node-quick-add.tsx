"use client";

import type { ComponentType } from "react";
import { forwardRef, memo, useCallback, useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "../../components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/dialog";
import { cn } from "../../utils";
import { Icons } from "../icons";

interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
}

interface NodeCategory {
  name: string;
  nodes: NodeDefinition[];
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: "AI Models",
    nodes: [
      {
        type: "llm",
        label: "LLM",
        description: "Language model for text generation",
        icon: Icons.Bot,
        shortcut: "L",
      },
      {
        type: "rag",
        label: "RAG",
        description: "Retrieval augmented generation",
        icon: Icons.Database,
        shortcut: "R",
      },
      {
        type: "embedding",
        label: "Embedding",
        description: "Convert text to vector embeddings",
        icon: Icons.BrainCircuit,
      },
    ],
  },
  {
    name: "Media Generation",
    nodes: [
      {
        type: "image",
        label: "Image",
        description: "Generate or process images",
        icon: Icons.ImageIcon,
        shortcut: "I",
      },
      {
        type: "audio",
        label: "Audio",
        description: "Speech synthesis or audio generation",
        icon: Icons.Mic,
        shortcut: "U",
      },
      {
        type: "video",
        label: "Video",
        description: "Video generation or processing",
        icon: Icons.Video,
        shortcut: "V",
      },
    ],
  },
  {
    name: "Control Flow",
    nodes: [
      {
        type: "input",
        label: "Input",
        description: "Workflow input source",
        icon: Icons.FileInput,
      },
      {
        type: "condition",
        label: "Condition",
        description: "Branch based on conditions",
        icon: Icons.GitBranch,
        shortcut: "C",
      },
      {
        type: "loop",
        label: "Loop",
        description: "Iterate over items",
        icon: Icons.Repeat,
      },
    ],
  },
  {
    name: "Transform",
    nodes: [
      {
        type: "code",
        label: "Code",
        description: "Execute custom code",
        icon: Icons.Code2,
        shortcut: "X",
      },
      {
        type: "transform",
        label: "Transform",
        description: "Transform data structure",
        icon: Icons.Wand,
      },
      {
        type: "agent",
        label: "Agent",
        description: "Autonomous AI agent",
        icon: Icons.Sparkles,
        shortcut: "A",
      },
    ],
  },
];

export interface NodeQuickAddProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (nodeType: string) => void;
  position?: { x: number; y: number };
  className?: string;
}

export const NodeQuickAdd = memo(
  forwardRef<HTMLDivElement, NodeQuickAddProps>(function NodeQuickAddComponent(
    { open = false, onOpenChange, onSelect, className },
    ref
  ) {
    const [search, setSearch] = useState("");

    const handleSelect = useCallback(
      (nodeType: string) => {
        onSelect?.(nodeType);
        onOpenChange?.(false);
        setSearch("");
      },
      [onSelect, onOpenChange]
    );

    useEffect(() => {
      if (!open) {
        setSearch("");
      }
    }, [open]);

    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent
          className={cn("max-w-md overflow-hidden p-0", className)}
          hideClose
          ref={ref}
        >
          <DialogTitle className="sr-only">Add Node</DialogTitle>
          <DialogDescription className="sr-only">
            Search and select a node type to add to the canvas
          </DialogDescription>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs">
            <CommandInput
              onValueChange={setSearch}
              placeholder="Search nodes..."
              value={search}
            />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>No nodes found.</CommandEmpty>
              {NODE_CATEGORIES.map((category) => (
                <CommandGroup heading={category.name} key={category.name}>
                  {category.nodes.map((node) => (
                    <CommandItem
                      key={node.type}
                      onSelect={() => handleSelect(node.type)}
                      value={`${node.label} ${node.description}`}
                    >
                      <node.icon
                        className="mr-2 text-muted-foreground"
                        size={16}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{node.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {node.description}
                        </span>
                      </div>
                      {node.shortcut && (
                        <CommandShortcut>{node.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  })
);

NodeQuickAdd.displayName = "NodeQuickAdd";

export interface UseNodeQuickAddOptions {
  onSelect?: (nodeType: string) => void;
  enabled?: boolean;
}

export function useNodeQuickAdd({
  onSelect,
  enabled = true,
}: UseNodeQuickAddOptions = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "a" && !e.metaKey && !e.ctrlKey && !e.altKey && !isInput) {
        e.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  const handleSelect = useCallback(
    (nodeType: string) => {
      onSelect?.(nodeType);
    },
    [onSelect]
  );

  return {
    open,
    setOpen,
    onSelect: handleSelect,
    props: {
      open,
      onOpenChange: setOpen,
      onSelect: handleSelect,
    },
  };
}
