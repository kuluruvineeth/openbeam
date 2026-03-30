const CONNECTOR_COLORS: Record<string, string> = {
  SLACK: "#611f69",
  GITHUB: "#6b7280",
  NOTION: "#000000",
  GOOGLE_DRIVE: "#3b82f6",
  LINEAR: "#7c3aed",
  JIRA: "#2563eb",
  CONFLUENCE: "#2563eb",
  GMAIL: "#ef4444",
};

type Props = {
  type: string;
  size?: number;
};

export function SourceIcon({ type, size = 20 }: Props) {
  const color = CONNECTOR_COLORS[type] ?? "#6b7280";
  const label = type.charAt(0).toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-sm text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.5,
        lineHeight: `${size}px`,
      }}
    >
      {label}
    </div>
  );
}
