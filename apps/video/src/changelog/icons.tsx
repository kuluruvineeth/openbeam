import type React from "react";

type IconProps = {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
};

export const SearchIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const MicIcon: React.FC<IconProps> = ({
  size = 24,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({
  size = 24,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const MessageSquareIcon: React.FC<IconProps> = ({
  size = 13,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({
  size = 12,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({
  size = 16,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

export const ExternalLinkIcon: React.FC<IconProps> = ({
  size = 14,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

export const SparklesIcon: React.FC<IconProps> = ({
  size = 16,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

export const AudioWaveIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M2 12h2" />
    <path d="M6 8v8" />
    <path d="M10 4v16" />
    <path d="M14 6v12" />
    <path d="M18 9v6" />
    <path d="M22 12h-2" />
  </svg>
);

export const ChevronUpIcon: React.FC<IconProps> = ({
  size = 14,
  color = "currentColor",
  style,
}) => (
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export function ClickCursor({
  x,
  y,
  visible,
  clicking,
}: {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <svg
        fill="#fff"
        height={24}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
        viewBox="0 0 24 24"
        width={24}
      >
        <path d="M5.65 3.15a1 1 0 0 0-1.5 1.06l3.06 15.3a1 1 0 0 0 1.82.26l2.97-4.46 5.03 1.68a1 1 0 0 0 1.22-1.42L5.65 3.15Z" />
      </svg>
      {clicking && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 24,
            height: 24,
            borderRadius: 12,
            border: "2px solid rgba(255,255,255,0.5)",
            transform: "scale(1.5)",
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}
