import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FilmGrain, GradientBg, Vignette } from "../demos/gradient-bg";
import { LT } from "../theme";

const V = {
  cardBg: "#FFFFFF",
  border: "#E8E5E0",
  headerBg: "#F5F3EF",
  text: "#1A1A1A",
  muted: "#6B6B6B",
  greenBadgeBg: "#ECFDF5",
  greenBadgeText: "#059669",
  blueBadgeBg: "#EFF6FF",
  blueBadgeText: "#2563EB",
  leafGreen: "#22C55E",
} as const;

const COLUMNS = ["Connector", "Status", "Last Sync", "Docs"] as const;
const COL_WIDTHS = [280, 140, 140, 100] as const;

const ROWS = [
  { name: "Slack", status: "Indexed", lastSync: "2h ago", docs: "3,241" },
  { name: "Notion", status: "Indexed", lastSync: "1h ago", docs: "2,156" },
  { name: "Linear", status: "Syncing", lastSync: "now", docs: "847" },
  { name: "GitHub", status: "Indexed", lastSync: "4h ago", docs: "4,832" },
  {
    name: "Google Drive",
    status: "Indexed",
    lastSync: "30m ago",
    docs: "1,771",
  },
] as const;

function StatusBadge({ status }: { status: string }) {
  const isGreen = status === "Indexed";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 4,
        background: isGreen ? V.greenBadgeBg : V.blueBadgeBg,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: LT.font.sans,
        color: isGreen ? V.greenBadgeText : V.blueBadgeText,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isGreen ? V.greenBadgeText : V.blueBadgeText,
        }}
      />
      {status}
    </div>
  );
}

function LeafIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={18}
      stroke={V.leafGreen}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={18}
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ConnectorDashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: 720,
        background: V.cardBg,
        borderRadius: 10,
        border: `1px solid ${V.border}`,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          background: V.headerBg,
          borderBottom: `1px solid ${V.border}`,
        }}
      >
        <LeafIcon />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            fontFamily: LT.font.sans,
            color: V.text,
            letterSpacing: -0.2,
          }}
        >
          Connectors
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "12px 20px",
          borderBottom: `1px solid ${V.border}`,
        }}
      >
        {["5 Connected", "5 Active", "12,847 Documents"].map((stat) => (
          <div
            key={stat}
            style={{
              fontSize: 12,
              fontFamily: LT.font.mono,
              color: V.muted,
              fontWeight: 500,
            }}
          >
            {stat}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          padding: "8px 20px",
          borderBottom: `1px solid ${V.border}`,
        }}
      >
        {COLUMNS.map((col, i) => (
          <div
            key={col}
            style={{
              width: COL_WIDTHS[i],
              fontSize: 11,
              fontWeight: 600,
              fontFamily: LT.font.sans,
              color: V.muted,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {ROWS.map((row, i) => {
        const rowDelay = 25 + i * 6;
        const rowProgress = spring({
          frame: frame - rowDelay,
          fps,
          config: { mass: 1, damping: 22, stiffness: 180 },
          from: 0,
          to: 1,
        });
        const rowOpacity = interpolate(rowProgress, [0, 0.3, 1], [0, 0.5, 1]);
        const rowX = interpolate(rowProgress, [0, 1], [12, 0]);

        return (
          <div
            key={row.name}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderBottom:
                i < ROWS.length - 1 ? `1px solid ${V.border}` : "none",
              opacity: rowOpacity,
              transform: `translateX(${rowX}px)`,
            }}
          >
            <div
              style={{
                width: COL_WIDTHS[0],
                fontSize: 14,
                fontWeight: 500,
                fontFamily: LT.font.sans,
                color: V.text,
              }}
            >
              {row.name}
            </div>
            <div style={{ width: COL_WIDTHS[1] }}>
              <StatusBadge status={row.status} />
            </div>
            <div
              style={{
                width: COL_WIDTHS[2],
                fontSize: 13,
                fontFamily: LT.font.sans,
                color: V.muted,
              }}
            >
              {row.lastSync}
            </div>
            <div
              style={{
                width: COL_WIDTHS[3],
                fontSize: 13,
                fontFamily: LT.font.mono,
                color: V.text,
                fontWeight: 500,
              }}
            >
              {row.docs}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const SceneExtApps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame: frame - 5,
    fps,
    config: { mass: 1, damping: 26, stiffness: 200 },
    from: 0.94,
    to: 1,
  });

  const cardOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const labelOpacity = interpolate(frame, [60, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelY = interpolate(frame, [60, 72], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [160, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBg opacity={0.1} variant="deep" />
      <FilmGrain opacity={0.03} />
      <Vignette intensity={0.5} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
          }}
        >
          <ConnectorDashboard />
        </div>

        <div
          style={{
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontFamily: LT.font.mono,
              color: LT.fgDim,
              letterSpacing: 0.5,
            }}
          >
            ext-apps view rendered inside Claude Desktop
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
