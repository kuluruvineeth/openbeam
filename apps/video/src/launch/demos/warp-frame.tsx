import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BLOCK_ACCENT_WIDTH,
  BLOCK_GAP,
  BLOCK_RADIUS,
  ChevronRightIcon,
  colorizeOutput,
  DOT_GAP,
  DOT_SIZE,
  FONT_MONO,
  GitBranchIcon,
  INPUT_HEIGHT,
  PlusTabIcon,
  SplitIcon,
  TAB_BAR_HEIGHT,
  TerminalIcon,
  W,
  WarpAiIcon,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from "./warp-theme";

interface CommandBlock {
  command: string;
  output: string[];
  directory?: string;
  branch?: string;
  exitCode?: number;
  durationMs?: number;
}

interface WarpFrameProps {
  blocks: CommandBlock[];
  activeTab?: string;
  style?: React.CSSProperties;
}

function TrafficLights() {
  return (
    <div style={{ display: "flex", gap: DOT_GAP, alignItems: "center" }}>
      {[W.trafficRed, W.trafficYellow, W.trafficGreen].map((color) => (
        <div
          key={color}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

function TabBar({ activeTab }: { activeTab: string }) {
  const tabs = [activeTab, "zsh"];

  return (
    <div
      style={{
        height: TAB_BAR_HEIGHT,
        background: W.bgTabBar,
        display: "flex",
        alignItems: "center",
        paddingLeft: 14,
        paddingRight: 14,
        gap: 0,
        borderBottom: `1px solid ${W.border}`,
        position: "relative",
      }}
    >
      <div style={{ marginRight: 14 }}>
        <TrafficLights />
      </div>

      <div style={{ display: "flex", gap: 1, flex: 1 }}>
        {tabs.map((tab, i) => {
          const isActive = i === 0;
          return (
            <div
              key={tab}
              style={{
                padding: "6px 16px",
                borderRadius: "6px 6px 0 0",
                background: isActive ? W.bgTabActive : "transparent",
                color: isActive ? W.fg : W.fgDim,
                fontSize: 12,
                fontFamily: FONT_MONO,
                fontWeight: isActive ? 500 : 400,
                display: "flex",
                alignItems: "center",
                gap: 6,
                position: "relative",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: W.accent,
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              )}
              <TerminalIcon color={isActive ? W.accent : W.fgDim} size={12} />
              <span>{tab}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <PlusTabIcon />
        <SplitIcon />
      </div>
    </div>
  );
}

function BlockPrompt({
  directory,
  branch,
}: {
  directory: string;
  branch?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
        fontSize: 12,
        fontFamily: FONT_MONO,
      }}
    >
      <ChevronRightIcon />
      <span style={{ color: W.fgPromptDir, fontWeight: 500 }}>{directory}</span>
      {branch && (
        <>
          <span style={{ color: W.fgDim }}>on</span>
          <GitBranchIcon />
          <span style={{ color: W.fgPromptBranch, fontWeight: 500 }}>
            {branch}
          </span>
        </>
      )}
    </div>
  );
}

function Block({
  block,
  isActive,
  enterProgress,
}: {
  block: CommandBlock;
  isActive: boolean;
  enterProgress: number;
}) {
  const directory = block.directory ?? "~/projects";
  const hasError = (block.exitCode ?? 0) !== 0;
  function resolveAccentColor() {
    if (hasError) {
      return W.red;
    }
    if (isActive) {
      return W.blockAccent;
    }
    return W.borderBlock;
  }
  const accentColor = resolveAccentColor();

  const opacity = interpolate(enterProgress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(enterProgress, [0, 1], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        background: W.bgBlock,
        borderRadius: BLOCK_RADIUS,
        border: `1px solid ${isActive ? `${W.borderActive}40` : W.borderBlock}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <div
        style={{
          width: BLOCK_ACCENT_WIDTH,
          background: accentColor,
          borderRadius: `${BLOCK_RADIUS}px 0 0 ${BLOCK_RADIUS}px`,
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, padding: "10px 14px" }}>
        <BlockPrompt branch={block.branch} directory={directory} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONT_MONO,
            fontSize: 13,
            fontWeight: 500,
            color: W.fgCommand,
            marginBottom: block.output.length > 0 ? 8 : 0,
          }}
        >
          <span style={{ color: W.fgDim }}>$</span>
          <span>{block.command}</span>
        </div>

        {block.output.length > 0 && (
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              lineHeight: 1.65,
              borderTop: `1px solid ${W.border}`,
              paddingTop: 8,
            }}
          >
            {block.output.map((line, i) => (
              <div key={i}>{colorizeOutput(line)}</div>
            ))}
          </div>
        )}

        {block.durationMs !== undefined && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 4,
              fontSize: 10,
              fontFamily: FONT_MONO,
              color: W.fgDim,
            }}
          >
            {block.durationMs}ms
          </div>
        )}
      </div>
    </div>
  );
}

function InputArea() {
  return (
    <div
      style={{
        height: INPUT_HEIGHT,
        borderTop: `1px solid ${W.border}`,
        background: W.bgInput,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 8,
      }}
    >
      <ChevronRightIcon color={W.accent} size={12} />
      <span
        style={{
          color: W.fgPromptDir,
          fontSize: 12,
          fontFamily: FONT_MONO,
          fontWeight: 500,
        }}
      >
        ~/projects
      </span>
      <span style={{ color: W.fgDim, fontSize: 12, fontFamily: FONT_MONO }}>
        on
      </span>
      <GitBranchIcon color={W.fgPromptBranch} size={11} />
      <span
        style={{
          color: W.fgPromptBranch,
          fontSize: 12,
          fontFamily: FONT_MONO,
          fontWeight: 500,
        }}
      >
        main
      </span>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          marginLeft: 8,
        }}
      >
        <div
          style={{
            width: 7,
            height: 18,
            background: W.accent,
            borderRadius: 1,
          }}
        />
      </div>
      <WarpAiIcon />
    </div>
  );
}

function Scrollbar() {
  return (
    <div
      style={{
        position: "absolute",
        right: 2,
        top: TAB_BAR_HEIGHT + 8,
        bottom: INPUT_HEIGHT + 8,
        width: 6,
        borderRadius: 3,
        background: W.scrollTrack,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20%",
          width: 6,
          height: "40%",
          borderRadius: 3,
          background: W.scrollThumb,
        }}
      />
    </div>
  );
}

export const WarpFrame: React.FC<WarpFrameProps> = ({
  blocks,
  activeTab = "openbeam \u2014 ~/projects",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const windowScale = spring({
    frame,
    fps,
    config: { mass: 1, damping: 28, stiffness: 260 },
    from: 0.96,
    to: 1,
  });

  const BLOCK_ENTRANCE_STAGGER = 10;
  const BLOCK_ENTRANCE_START = 6;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: windowOpacity,
        transform: `scale(${windowScale})`,
        ...style,
      }}
    >
      <div
        style={{
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          background: W.bg,
          position: "relative",
        }}
      >
        <TabBar activeTab={activeTab} />

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: BLOCK_GAP,
          }}
        >
          {blocks.map((block, i) => {
            const blockFrame =
              BLOCK_ENTRANCE_START + i * BLOCK_ENTRANCE_STAGGER;
            const enterProgress = spring({
              frame: frame - blockFrame,
              fps,
              config: { mass: 1, damping: 24, stiffness: 200 },
            });
            const isActive = i === blocks.length - 1;

            return (
              <Block
                block={block}
                enterProgress={enterProgress}
                isActive={isActive}
                key={i}
              />
            );
          })}
        </div>

        <InputArea />
        <Scrollbar />
      </div>
    </div>
  );
};

export { W as WARP_COLORS };
export type { CommandBlock, WarpFrameProps };
