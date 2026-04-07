import type React from "react";

interface MacOSCursorProps {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}

export const MacOSCursor: React.FC<MacOSCursorProps> = ({
  x,
  y,
  scale = 1,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `scale(${scale})`,
      transformOrigin: "0 0",
      opacity,
      pointerEvents: "none",
      zIndex: 9999,
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
    }}
  >
    <svg
      aria-hidden="true"
      fill="none"
      height="22"
      viewBox="0 0 17 22"
      width="17"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1L1 18.3L5.3 14.3L8.6 21L11.3 19.7L8.1 13.1L13.8 12.5L1 1Z"
        fill="white"
        stroke="black"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  </div>
);
