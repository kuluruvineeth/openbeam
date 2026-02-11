"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Icons,
} from "@openplane/ui";
import type { CommandDefinition } from "../constants/commands";
import {
  APPROVAL_COMMANDS,
  GLOBAL_COMMANDS,
  MISSION_COMMANDS,
  TAB_COMMANDS,
} from "../constants/commands";

type MissionCommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (commandId: string) => void;
  contextCommands?: CommandDefinition[];
  pendingApprovalCount?: number;
};

const GROUP_LABELS: Record<CommandDefinition["group"], string> = {
  navigation: "Navigation",
  mission: "Mission",
  tabs: "Tabs",
  approvals: "Approvals",
};

const GROUP_ICONS: Record<CommandDefinition["group"], React.ReactNode> = {
  navigation: <Icons.ArrowRight size={14} />,
  mission: <Icons.Play size={14} />,
  tabs: <Icons.Layers size={14} />,
  approvals: <Icons.ShieldAlert size={14} />,
};

function groupCommands(
  commands: CommandDefinition[]
): Map<CommandDefinition["group"], CommandDefinition[]> {
  const groups = new Map<CommandDefinition["group"], CommandDefinition[]>();
  for (const cmd of commands) {
    const existing = groups.get(cmd.group) ?? [];
    existing.push(cmd);
    groups.set(cmd.group, existing);
  }
  return groups;
}

function formatShortcut(shortcut: string): string {
  return shortcut
    .replace("Cmd", "\u2318")
    .replace("Shift", "\u21E7")
    .replace("Alt", "\u2325")
    .replace(/\+/g, "");
}

export function MissionCommandPalette({
  isOpen,
  onClose,
  onCommand,
  contextCommands = [],
  pendingApprovalCount = 0,
}: MissionCommandPaletteProps) {
  const allCommands = [
    ...GLOBAL_COMMANDS,
    ...MISSION_COMMANDS,
    ...TAB_COMMANDS,
    ...(pendingApprovalCount > 0 ? APPROVAL_COMMANDS : []),
    ...contextCommands,
  ];

  const grouped = groupCommands(allCommands);

  function handleSelect(commandId: string) {
    onCommand(commandId);
    onClose();
  }

  return (
    <CommandDialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {Array.from(grouped.entries()).map(([group, commands]) => (
          <CommandGroup heading={GROUP_LABELS[group]} key={group}>
            {commands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                onSelect={() => handleSelect(cmd.id)}
                value={cmd.label}
              >
                {GROUP_ICONS[group]}
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <CommandShortcut>
                    {formatShortcut(cmd.shortcut)}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
