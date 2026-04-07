import type React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import {
  CheckCircleIcon as CheckCircleIconBase,
  CodeToggleIcon,
  OpenBeamIcon as OpenBeamIconBase,
  TC,
} from "../demos/tool-call-primitives";
import { LT } from "../theme";

function OpenBeamIcon() {
  return <OpenBeamIconBase size={20} />;
}

function CheckCircleIcon() {
  return <CheckCircleIconBase size={14} />;
}

function ChevronIcon({ down }: { down: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={12}
      stroke="#6B6B6B"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      style={{ transform: down ? "rotate(90deg)" : "rotate(0deg)" }}
      viewBox="0 0 24 24"
      width={12}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ToolCallHeader({
  toolName,
  frame,
  startFrame,
}: {
  toolName: string;
  frame: number;
  startFrame: number;
}) {
  if (frame < startFrame) {
    return null;
  }
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { mass: 1, damping: 22, stiffness: 220 },
    from: 0.96,
    to: 1,
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          background: TC.headerBg,
          borderRadius: 8,
          border: `1px solid ${TC.headerBorder}`,
        }}
      >
        <OpenBeamIcon />
        <span
          style={{
            fontSize: 14,
            fontFamily: LT.font.sans,
            color: TC.headerLabelText,
            fontWeight: 500,
          }}
        >
          Openbeam
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.mono,
            color: TC.toolNameMono,
            fontWeight: 400,
          }}
        >
          {toolName}
        </span>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px 6px",
            borderRadius: 4,
            border: `1px solid ${TC.headerBorder}`,
            background: TC.cardBg,
          }}
        >
          <CodeToggleIcon size={14} />
        </div>
      </div>
    </div>
  );
}

export function CollapsibleToolCall({
  label,
  frame,
  startFrame,
  showDone = false,
  doneFrame = 0,
  children,
}: {
  label: string;
  frame: number;
  startFrame: number;
  showDone?: boolean;
  doneFrame?: number;
  children?: React.ReactNode;
}) {
  if (frame < startFrame) {
    return null;
  }

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const isDone = showDone && frame >= doneFrame;

  return (
    <div style={{ opacity }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 0",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            color: TC.toolLabelText,
            fontWeight: 400,
          }}
        >
          {label}
        </span>
        <ChevronIcon down />
      </div>

      {isDone && (
        <div style={{ display: "flex", marginLeft: 6 }}>
          <div
            style={{
              width: 2,
              background: TC.pipeBorder,
              borderRadius: 1,
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          />
          <div
            style={{
              marginLeft: 12,
              paddingTop: 6,
              paddingBottom: 6,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <OpenBeamIcon />
              <span
                style={{
                  fontSize: 13,
                  fontFamily: LT.font.sans,
                  fontWeight: 500,
                  color: TC.toolLabelDark,
                }}
              >
                {label}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: LT.font.sans,
                fontWeight: 500,
                color: TC.resultPillText,
                background: TC.resultPillBg,
                padding: "1px 7px",
                borderRadius: 4,
                alignSelf: "flex-start",
              }}
            >
              Result
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircleIcon />
              <span
                style={{
                  fontSize: 13,
                  fontFamily: LT.font.sans,
                  fontWeight: 500,
                  color: TC.toolLabelDark,
                }}
              >
                Done
              </span>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

export function SearchedToolsLine({
  frame,
  startFrame,
}: {
  frame: number;
  startFrame: number;
}) {
  if (frame < startFrame) {
    return null;
  }

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            color: TC.searchedText,
            fontWeight: 400,
          }}
        >
          Searched available tools
        </span>
        <ChevronIcon down={false} />
      </div>
    </div>
  );
}
