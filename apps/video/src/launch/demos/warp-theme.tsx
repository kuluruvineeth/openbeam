import type React from "react";

export const W = {
  bg: "#181818",
  bgSurface: "#1e1e1e",
  bgBlock: "#1a1a1a",
  bgBlockHover: "#222222",
  bgInput: "#1e1e1e",
  bgTab: "#111111",
  bgTabActive: "#181818",
  bgTabBar: "#0e0e0e",
  fg: "#d8d8d8",
  fgMuted: "#888888",
  fgDim: "#585858",
  fgPromptDir: "#7cafc2",
  fgPromptBranch: "#a1b56c",
  fgCommand: "#d8d8d8",
  fgOutput: "#a0a0a0",
  accent: "#7cafc2",
  accentDim: "#7cafc230",
  green: "#a1b56c",
  red: "#ab4642",
  yellow: "#f7ca88",
  cyan: "#86c1b9",
  magenta: "#ba8baf",
  blue: "#7cafc2",
  border: "#2a2a2a",
  borderBlock: "#2a2a2a",
  borderActive: "#7cafc2",
  blockAccent: "#7cafc2",
  trafficRed: "#ff5f57",
  trafficYellow: "#febc2e",
  trafficGreen: "#28c840",
  scrollTrack: "#1a1a1a",
  scrollThumb: "#3a3a3a",
} as const;

export const JSON_KEY_REGEX = /^(\s*)("[\w]+")(:\s*)(.*)/;
export const DIGIT_START_REGEX = /^\d/;
export const FONT_MONO = "'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace";
export const WINDOW_WIDTH = 1000;
export const WINDOW_HEIGHT = 640;
export const TAB_BAR_HEIGHT = 38;
export const INPUT_HEIGHT = 56;
export const DOT_SIZE = 11;
export const DOT_GAP = 7;
export const BLOCK_RADIUS = 6;
export const BLOCK_ACCENT_WIDTH = 3;
export const BLOCK_GAP = 8;

export function TerminalIcon({
  size = 14,
  color = W.fgDim,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

export function PlusTabIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke={W.fgDim}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={14}
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

export function SplitIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={14}
      stroke={W.fgDim}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={14}
    >
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <line x1="12" x2="12" y1="3" y2="21" />
    </svg>
  );
}

export function ChevronRightIcon({
  size = 10,
  color = W.fgPromptDir,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={size}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function GitBranchIcon({
  size = 11,
  color = W.fgPromptBranch,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

export function WarpAiIcon() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: W.accentDim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height={14}
        stroke={W.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
        width={14}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

export function colorizeOutput(line: string): React.ReactNode {
  if (line.startsWith("  \u2713") || line.startsWith("  \u2714")) {
    return <span style={{ color: W.green }}>{line}</span>;
  }
  if (
    line.startsWith("  \u2717") ||
    line.startsWith("  \u2718") ||
    line.startsWith("ERROR")
  ) {
    return <span style={{ color: W.red }}>{line}</span>;
  }
  if (line.startsWith("  \u2192") || line.startsWith("  \u25B8")) {
    return <span style={{ color: W.cyan }}>{line}</span>;
  }

  const jsonKeyMatch = line.match(JSON_KEY_REGEX);
  if (jsonKeyMatch) {
    const [, indent, key, colon, value] = jsonKeyMatch;
    let valueColor: string = W.fgOutput;
    if (value.startsWith('"')) {
      valueColor = W.green;
    } else if (value === "true" || value === "false") {
      valueColor = W.yellow;
    } else if (DIGIT_START_REGEX.test(value)) {
      valueColor = W.magenta;
    }
    return (
      <span>
        <span>{indent}</span>
        <span style={{ color: W.cyan }}>{key}</span>
        <span style={{ color: W.fgDim }}>{colon}</span>
        <span style={{ color: valueColor }}>{value}</span>
      </span>
    );
  }

  if (
    line.trim() === "{" ||
    line.trim() === "}" ||
    line.trim() === "[" ||
    line.trim() === "]" ||
    line.trim() === "},"
  ) {
    return <span style={{ color: W.fgDim }}>{line}</span>;
  }

  return <span style={{ color: W.fgOutput }}>{line}</span>;
}
