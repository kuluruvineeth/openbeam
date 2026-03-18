import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SPRING_CARD } from "../../lib/easing";
import { Camera, type CameraKeyframe } from "../camera";
import { CLF } from "../fonts";
import { ClickCursor } from "../icons";

const GH = {
  bg: "#0d1117",
  headerBg: "#010409",
  card: "#161b22",
  border: "#30363d",
  fg: "#e6edf3",
  fgMuted: "#7d8590",
  fgDim: "#484f58",
  green: "#3fb950",
  purple: "#a371f7",
  blue: "#58a6ff",
  red: "#f85149",
  teal: "#39d353",
} as const;

type Issue = {
  num: number;
  title: string;
  labels: Array<{ text: string; color: string }>;
  time: string;
};

const ISSUES: Issue[] = [
  {
    num: 42,
    title: "We need SOC 2 and ISO 27001 controls searchable alongside CVEs",
    labels: [
      { text: "data-request", color: GH.blue },
      { text: "voice", color: GH.green },
    ],
    time: "2 minutes ago",
  },
  {
    num: 41,
    title:
      "I searched for a fix for CVE-2023-44487 but there's no remediation guidance",
    labels: [
      { text: "bug", color: GH.red },
      { text: "voice", color: GH.green },
    ],
    time: "15 minutes ago",
  },
  {
    num: 40,
    title: "Can I filter vulnerabilities by the software we actually run?",
    labels: [
      { text: "enhancement", color: GH.teal },
      { text: "voice", color: GH.green },
    ],
    time: "1 hour ago",
  },
  {
    num: 39,
    title:
      "Searching by KEV takes 10+ seconds, I need this during incident response",
    labels: [
      { text: "user-feedback", color: GH.purple },
      { text: "voice", color: GH.green },
    ],
    time: "3 hours ago",
  },
  {
    num: 38,
    title: "Our auditor asked for CIS Benchmarks — can you add those?",
    labels: [
      { text: "data-request", color: GH.blue },
      { text: "voice", color: GH.green },
    ],
    time: "5 hours ago",
  },
];

const DETAIL_BLOCKQUOTE =
  "We need SOC 2 and ISO 27001 controls searchable alongside CVEs. Our auditor keeps asking and I can't find them here.";
const DETAIL_CONTEXT = [
  { label: "Source", value: "Voice feedback" },
  { label: "Page", value: "/search" },
  { label: "Query", value: "SOC 2 compliance" },
  { label: "Results found", value: "0" },
  { label: "Browser", value: "Chrome 122 / macOS" },
  { label: "Timestamp", value: "2026-03-18 09:14 UTC" },
];

const FIRST_ISSUE_Y = 198;
const FIRST_ISSUE_X = 500;

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { frame: 0, x: 960, y: 540, scale: 1 },
  { frame: 80, x: 960, y: 540, scale: 1 },
  { frame: 110, x: 400, y: FIRST_ISSUE_Y, scale: 1.25 },
  { frame: 170, x: 400, y: FIRST_ISSUE_Y, scale: 1.25 },
  { frame: 200, x: 960, y: 540, scale: 1 },
  { frame: 240, x: 960, y: 540, scale: 1 },
  { frame: 270, x: 600, y: 350, scale: 1.15 },
  { frame: 370, x: 600, y: 350, scale: 1.15 },
  { frame: 400, x: 960, y: 540, scale: 1 },
  { frame: 420, x: 960, y: 540, scale: 1 },
];

function GhLabel({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        borderRadius: 12,
        border: `1px solid ${color}60`,
        color,
        fontFamily: CLF.sans,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.6,
      }}
    >
      {text}
    </span>
  );
}

function GitHubIcon() {
  return (
    <svg fill={GH.fg} height={28} viewBox="0 0 16 16" width={28}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function OpenDot() {
  return (
    <svg fill="none" height={16} viewBox="0 0 16 16" width={16}>
      <circle cx="8" cy="8" r="6" stroke={GH.green} strokeWidth={2} />
    </svg>
  );
}

export const SceneGitHub: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showList = frame < 200;
  const showDetail = frame >= 195;

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const listFadeOut = showDetail
    ? interpolate(frame, [192, 205], [1, 0], { extrapolateRight: "clamp" })
    : 1;
  const detailFadeIn = showDetail
    ? interpolate(frame, [200, 218], [0, 1], { extrapolateRight: "clamp" })
    : 0;

  const firstIssueHighlight =
    frame >= 175 && frame < 200 ? `${GH.fg}08` : "transparent";

  const NAV_TABS = ["Code", "Issues", "Pull requests", "Actions"];

  const issueClickY = FIRST_ISSUE_Y;
  const cursorX = interpolate(
    frame,
    [165, 180, 195, 205],
    [FIRST_ISSUE_X + 80, FIRST_ISSUE_X, FIRST_ISSUE_X, FIRST_ISSUE_X - 60],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorY = interpolate(
    frame,
    [165, 180, 195, 205],
    [issueClickY + 60, issueClickY, issueClickY, issueClickY],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorClicking = frame >= 190 && frame < 195;
  const cursorShown = frame >= 165 && frame < 205;

  return (
    <AbsoluteFill style={{ background: GH.bg }}>
      <Camera height={1080} keyframes={CAMERA_KEYFRAMES} width={1920}>
        <AbsoluteFill>
          <div
            style={{
              background: GH.headerBg,
              height: 62,
              borderBottom: `1px solid ${GH.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 80px",
              gap: 12,
              opacity: headerOpacity,
            }}
          >
            <GitHubIcon />
            <span
              style={{
                fontFamily: CLF.sans,
                fontSize: 16,
                color: GH.fg,
                fontWeight: 600,
              }}
            >
              kuluruvineeth
            </span>
            <span style={{ color: GH.fgMuted, fontSize: 16 }}>/</span>
            <span
              style={{
                fontFamily: CLF.sans,
                fontSize: 16,
                color: GH.fg,
                fontWeight: 700,
              }}
            >
              openbeam
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 0,
              padding: "0 80px",
              borderBottom: `1px solid ${GH.border}`,
              opacity: headerOpacity,
            }}
          >
            {NAV_TABS.map((tab) => {
              const isIssues = tab === "Issues";
              return (
                <div
                  key={tab}
                  style={{
                    padding: "10px 16px",
                    fontFamily: CLF.sans,
                    fontSize: 13,
                    color: isIssues ? GH.fg : GH.fgMuted,
                    fontWeight: isIssues ? 600 : 400,
                    borderBottom: isIssues
                      ? "2px solid #f78166"
                      : "2px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab}
                  {isIssues && (
                    <span
                      style={{
                        background: `${GH.fgDim}40`,
                        color: GH.fg,
                        fontSize: 11,
                        padding: "0 6px",
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      42
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "24px 80px", position: "relative" }}>
            {showList && (
              <div style={{ opacity: listFadeOut }}>
                <div
                  style={{
                    border: `1px solid ${GH.border}`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "12px 16px",
                      background: GH.card,
                      borderBottom: `1px solid ${GH.border}`,
                      fontFamily: CLF.sans,
                      fontSize: 13,
                      color: GH.fgMuted,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <OpenDot />
                      <strong style={{ color: GH.fg, fontWeight: 600 }}>
                        42 Open
                      </strong>
                    </span>
                    <span>18 Closed</span>
                  </div>

                  {ISSUES.map((issue, i) => {
                    const rowStart = 20 + i * 8;
                    const rowProgress = spring({
                      frame: frame - rowStart,
                      fps,
                      config: SPRING_CARD,
                    });
                    const rowOpacity = interpolate(
                      rowProgress,
                      [0, 0.5],
                      [0, 1],
                      { extrapolateRight: "clamp" }
                    );

                    const isFirst = i === 0;

                    return (
                      <div
                        key={issue.num}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: `1px solid ${GH.border}`,
                          opacity: rowOpacity,
                          background: isFirst
                            ? firstIssueHighlight
                            : "transparent",
                        }}
                      >
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          <OpenDot />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: CLF.sans,
                                fontSize: 15,
                                fontWeight: 600,
                                color: GH.fg,
                              }}
                            >
                              {issue.title}
                            </span>
                            {issue.labels.map((l) => (
                              <GhLabel
                                color={l.color}
                                key={l.text}
                                text={l.text}
                              />
                            ))}
                          </div>
                          <div
                            style={{
                              fontFamily: CLF.sans,
                              fontSize: 12,
                              color: GH.fgMuted,
                            }}
                          >
                            #{issue.num} opened {issue.time} by openbeam-bot
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showDetail && (
              <div
                style={{
                  padding: "0 40px",
                  opacity: detailFadeIn,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      borderRadius: 16,
                      background: GH.green,
                      color: "#fff",
                      fontFamily: CLF.sans,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <OpenDot />
                    Open
                  </span>
                  <span
                    style={{
                      fontFamily: CLF.sans,
                      fontSize: 13,
                      color: GH.fgMuted,
                    }}
                  >
                    #42 opened 2 minutes ago by{" "}
                    <span style={{ fontWeight: 500, color: GH.fg }}>
                      openbeam-bot
                    </span>
                  </span>
                </div>

                <h2
                  style={{
                    fontFamily: CLF.sans,
                    fontSize: 30,
                    fontWeight: 700,
                    color: GH.fg,
                    marginBottom: 12,
                    opacity: interpolate(frame, [205, 220], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  We need SOC 2 and ISO 27001 controls searchable alongside CVEs
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 24,
                    opacity: interpolate(frame, [210, 225], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <GhLabel color={GH.blue} text="data-request" />
                  <GhLabel color={GH.green} text="voice" />
                </div>

                <div
                  style={{
                    borderLeft: `3px solid ${GH.border}`,
                    padding: "12px 20px",
                    marginBottom: 24,
                    opacity: interpolate(frame, [225, 245], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                    transform: `translateY(${interpolate(
                      frame,
                      [225, 245],
                      [8, 0],
                      { extrapolateRight: "clamp" }
                    )}px)`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: CLF.sans,
                      fontSize: 15,
                      fontStyle: "italic",
                      color: GH.fg,
                      lineHeight: 1.6,
                    }}
                  >
                    "{DETAIL_BLOCKQUOTE}"
                  </p>
                </div>

                <div
                  style={{
                    border: `1px solid ${GH.border}`,
                    borderRadius: 6,
                    overflow: "hidden",
                    opacity: interpolate(frame, [255, 270], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      background: GH.card,
                      borderBottom: `1px solid ${GH.border}`,
                      fontFamily: CLF.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: GH.fg,
                    }}
                  >
                    Context
                  </div>
                  {DETAIL_CONTEXT.map((item, i) => {
                    const ctxStart = 260 + i * 5;
                    const ctxProgress = spring({
                      frame: frame - ctxStart,
                      fps,
                      config: SPRING_CARD,
                    });
                    return (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 16px",
                          borderBottom: `1px solid ${GH.border}`,
                          fontFamily: CLF.sans,
                          fontSize: 13,
                          opacity: interpolate(ctxProgress, [0, 0.5], [0, 1], {
                            extrapolateRight: "clamp",
                          }),
                        }}
                      >
                        <span style={{ color: GH.fgMuted }}>{item.label}</span>
                        <span
                          style={{
                            color: GH.fg,
                            fontFamily: CLF.mono,
                            fontSize: 12,
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    opacity: interpolate(frame, [310, 330], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                    transform: `translateY(${interpolate(frame, [310, 330], [6, 0], { extrapolateRight: "clamp" })}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      overflow: "hidden",
                      flexShrink: 0,
                      border: `1px solid ${GH.border}`,
                    }}
                  >
                    <Img
                      src={staticFile("logo.png")}
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      border: `1px solid ${GH.border}`,
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 16px",
                        background: GH.card,
                        borderBottom: `1px solid ${GH.border}`,
                        fontFamily: CLF.sans,
                        fontSize: 12,
                        color: GH.fgMuted,
                      }}
                    >
                      <strong style={{ color: GH.fg }}>openbeam-bot</strong>{" "}
                      commented 1 minute ago
                    </div>
                    <div
                      style={{
                        padding: "12px 16px",
                        fontFamily: CLF.sans,
                        fontSize: 13,
                        color: GH.fg,
                        lineHeight: 1.6,
                      }}
                    >
                      Auto-triaged as <strong>data-request</strong>. The user
                      searched for SOC 2 compliance controls and found 0
                      results. This indicates a gap in our indexed data sources.
                      Routing to the data pipeline team.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ClickCursor
            clicking={cursorClicking}
            visible={cursorShown}
            x={cursorX}
            y={cursorY}
          />
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};
