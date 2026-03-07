"use client";

import { Icons } from "@openbeam/ui";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@openbeam/ui/components/command";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface CommandAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandGroupConfig {
  id: string;
  label: string;
  actions: CommandAction[];
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const controlledOpen = open ?? isOpen;
  const setOpen = onOpenChange ?? setIsOpen;

  const handleSelect = useCallback(
    (action: () => void) => {
      setOpen(false);
      action();
    },
    [setOpen]
  );

  const groups: CommandGroupConfig[] = [
    {
      id: "navigation",
      label: "Navigation",
      actions: [
        {
          id: "home",
          label: "Go to Home",
          icon: <Icons.Home size={16} />,
          shortcut: "⌘H",
          onSelect: () => router.push("/"),
          keywords: ["dashboard", "main"],
        },
        {
          id: "search",
          label: "Search",
          icon: <Icons.Search size={16} />,
          shortcut: "/",
          onSelect: () => router.push("/search"),
          keywords: ["find", "query"],
        },
        {
          id: "agents",
          label: "Agents",
          icon: <Icons.BotIcon size={16} />,
          onSelect: () => router.push("/agents"),
          keywords: ["automation", "workflows", "ai"],
        },
        {
          id: "connectors",
          label: "Connectors",
          icon: <Icons.Link size={16} />,
          onSelect: () => router.push("/connectors"),
          keywords: ["integrations", "sources", "data"],
        },
      ],
    },
    {
      id: "actions",
      label: "Actions",
      actions: [
        {
          id: "new-agent",
          label: "Create New Agent",
          icon: <Icons.Plus size={16} />,
          shortcut: "⌘⇧A",
          onSelect: () => router.push("/agents/new"),
          keywords: ["add", "create", "agent"],
        },
        {
          id: "new-connector",
          label: "Add Connector",
          icon: <Icons.Settings size={16} />,
          shortcut: "⌘⇧C",
          onSelect: () => router.push("/connectors"),
          keywords: ["add", "integration", "source", "setup"],
        },
      ],
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!controlledOpen);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen, controlledOpen]);

  return (
    <CommandDialog onOpenChange={setOpen} open={controlledOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup heading={group.label} key={group.id}>
            {group.actions.map((action) => (
              <CommandItem
                key={action.id}
                keywords={action.keywords}
                onSelect={() => handleSelect(action.onSelect)}
              >
                {action.icon}
                <span>{action.label}</span>
                {action.shortcut && (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export type { CommandAction, CommandGroupConfig, CommandPaletteProps };
export { CommandPalette };
