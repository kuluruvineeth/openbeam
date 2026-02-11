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
    id: "tab-timeline",
    label: "Go to Timeline",
    shortcut: "1",
    group: "tabs",
  },
  { id: "tab-agents", label: "Go to Agents", shortcut: "2", group: "tabs" },
  {
    id: "tab-approvals",
    label: "Go to Approvals",
    shortcut: "3",
    group: "tabs",
  },
  { id: "tab-tasks", label: "Go to Tasks", shortcut: "4", group: "tabs" },
  {
    id: "tab-artifacts",
    label: "Go to Artifacts",
    shortcut: "5",
    group: "tabs",
  },
  { id: "tab-memory", label: "Go to Memory", shortcut: "6", group: "tabs" },
  { id: "tab-budget", label: "Go to Budget", shortcut: "7", group: "tabs" },
  {
    id: "tab-ledger",
    label: "Go to Event Ledger",
    shortcut: "8",
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
      { keys: ["1-8"], action: "Switch detail tab" },
      { keys: ["Cmd", "P"], action: "Pause/Resume mission" },
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
