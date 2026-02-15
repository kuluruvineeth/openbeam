type CommandDefinition = {
  id: string;
  label: string;
  shortcut?: string;
  group: "navigation" | "mission" | "tabs" | "approvals";
};

const GLOBAL_COMMANDS: CommandDefinition[] = [
  {
    id: "create-mission",
    label: "Create Mission",
    shortcut: "Cmd+N",
    group: "navigation",
  },
  { id: "go-missions", label: "Go to Missions", group: "navigation" },
  { id: "go-settings", label: "Go to Settings", group: "navigation" },
];

const MISSION_COMMANDS: CommandDefinition[] = [
  {
    id: "pause-mission",
    label: "Pause Mission",
    shortcut: "Cmd+P",
    group: "mission",
  },
  { id: "resume-mission", label: "Resume Mission", group: "mission" },
  {
    id: "cancel-mission",
    label: "Cancel Mission",
    shortcut: "Cmd+Shift+C",
    group: "mission",
  },
];

const TAB_COMMANDS: CommandDefinition[] = [
  {
    id: "toggle-squad-panel",
    label: "Toggle Squad Panel",
    shortcut: "Cmd+Shift+B",
    group: "tabs",
  },
  {
    id: "toggle-chat-panel",
    label: "Toggle Chat Panel",
    shortcut: "Cmd+B",
    group: "tabs",
  },
];

const APPROVAL_COMMANDS: CommandDefinition[] = [
  {
    id: "approve-next",
    label: "Approve Next Pending",
    group: "approvals",
  },
  { id: "reject-next", label: "Reject Next Pending", group: "approvals" },
  {
    id: "review-approvals",
    label: "Review All Pending",
    group: "approvals",
  },
];

const SHORTCUT_GROUPS = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["Cmd", "K"], action: "Open command palette" },
      { keys: ["Cmd", "N"], action: "Create new mission" },
      { keys: ["?"], action: "Show keyboard shortcuts" },
      { keys: ["Esc"], action: "Close panel/dialog" },
    ],
  },
  {
    title: "Mission List",
    shortcuts: [
      { keys: ["j"], action: "Next mission" },
      { keys: ["k"], action: "Previous mission" },
      { keys: ["Enter"], action: "Open mission" },
      { keys: ["x"], action: "Toggle selection" },
      { keys: ["/"], action: "Focus search" },
      { keys: ["v"], action: "Toggle view mode" },
      { keys: ["1-5"], action: "Switch status tab" },
    ],
  },
  {
    title: "Mission Detail",
    shortcuts: [
      { keys: ["Cmd", "B"], action: "Toggle chat panel" },
      { keys: ["Cmd", "Shift", "B"], action: "Toggle squad panel" },
      { keys: ["Esc"], action: "Deselect agent" },
      { keys: ["Cmd", "P"], action: "Pause/Resume mission" },
      { keys: ["Cmd", "Shift", "S"], action: "Spawn agent" },
      { keys: ["Cmd", "Shift", "E"], action: "Extend timeout tiers" },
      { keys: ["["], action: "Previous mission" },
      { keys: ["]"], action: "Next mission" },
    ],
  },
  {
    title: "Task Board",
    shortcuts: [
      { keys: ["n"], action: "New task" },
      { keys: ["j", "k"], action: "Navigate vertically" },
      { keys: ["h", "l"], action: "Navigate columns" },
      { keys: ["1-4"], action: "Set priority P0-P3" },
      { keys: ["d"], action: "Delete task" },
    ],
  },
  {
    title: "Approvals",
    shortcuts: [
      { keys: ["y"], action: "Approve selected" },
      { keys: ["r"], action: "Reject selected" },
      { keys: ["Enter"], action: "Expand details" },
    ],
  },
] as const;

export {
  APPROVAL_COMMANDS,
  GLOBAL_COMMANDS,
  MISSION_COMMANDS,
  SHORTCUT_GROUPS,
  TAB_COMMANDS,
};
export type { CommandDefinition };
