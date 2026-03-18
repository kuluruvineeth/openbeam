import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SPRING_CARD } from "../../lib/easing";
import { Camera, type CameraKeyframe } from "../camera";
import { CLF } from "../fonts";
import { ChevronUpIcon, CloseIcon, SearchIcon, SparklesIcon } from "../icons";
import { CL } from "../theme";

const SOURCE_ORG: Record<string, string> = {
  CVE: "NVD",
  "ATT&CK": "MITRE",
  KEV: "CISA",
  OWASP: "OWASP",
};

const SOURCES = [
  { label: "CVE", color: CL.sourceNvd, count: 47 },
  { label: "ATT&CK", color: CL.sourceAttack, count: 3 },
  { label: "KEV", color: CL.sourceKev, count: 1 },
  { label: "OWASP", color: CL.sourceOwasp, count: 1 },
];

const AI_OVERVIEW_TEXT =
  "Log4Shell (CVE-2021-44228) is a critical remote code execution vulnerability in Apache Log4j2, " +
  "a widely-used Java logging framework. The flaw exists in the JNDI lookup feature, allowing " +
  "attackers to execute arbitrary code by sending specially crafted log messages. With a CVSS score " +
  "of 10.0, it affects versions 2.0-beta9 through 2.14.1 and has been actively exploited since " +
  "December 2021.";

const AI_OVERVIEW_BULLETS = [
  {
    bold: "Affected versions:",
    text: "Apache Log4j2 2.0-beta9 through 2.14.1. Upgrade to 2.17.1+ immediately",
  },
  {
    bold: "Attack vector:",
    text: "Remote, unauthenticated — any input that gets logged can trigger the exploit",
  },
  {
    bold: "CISA KEV:",
    text: "Added December 10, 2021. Federal agencies had until December 24 to patch",
  },
  {
    bold: "Mitigation:",
    text: "Set log4j2.formatMsgNoLookups=true as immediate workaround if patching is delayed",
  },
];

const AI_CITATIONS = [
  { num: 1, label: "CVE-2021-44228", color: CL.red400, source: "CVE" },
  { num: 2, label: "CISA KEV Advisory", color: CL.orange400, source: "KEV" },
  {
    num: 3,
    label: "T1190 Initial Access",
    color: CL.purple400,
    source: "ATT&CK",
  },
  { num: 4, label: "CVE-2021-45046", color: CL.red400, source: "CVE" },
];

type ResultRow = {
  source: string;
  sourceColor: string;
  sourceBg: string;
  title: string;
  snippet: string;
  date: string;
  cvss?: string;
};

const RESULTS: ResultRow[] = [
  {
    source: "CVE",
    sourceColor: CL.red400,
    sourceBg: CL.sourceNvd.bg,
    title: "CVE-2021-44228 — Apache Log4j2 JNDI RCE",
    snippet:
      "Apache Log4j2 <=2.14.1 JNDI features used in configuration, log messages, and parameters do not protect against attacker-controlled LDAP and other JNDI related endpoints.",
    date: "Dec 2021",
    cvss: "10.0",
  },
  {
    source: "CVE",
    sourceColor: CL.red400,
    sourceBg: CL.sourceNvd.bg,
    title: "CVE-2021-45046 — Log4j2 Thread Context DoS",
    snippet:
      "The fix to address CVE-2021-44228 in Apache Log4j 2.15.0 was incomplete in certain non-default configurations, allowing attackers to craft malicious input data.",
    date: "Dec 2021",
    cvss: "9.0",
  },
  {
    source: "ATT&CK",
    sourceColor: CL.purple400,
    sourceBg: CL.sourceAttack.bg,
    title: "T1190 — Exploit Public-Facing Application",
    snippet:
      "Adversaries may attempt to exploit a weakness in an internet-facing host or system to initially access a network. Log4Shell is a widely-observed example.",
    date: "Oct 2023",
  },
  {
    source: "KEV",
    sourceColor: CL.orange400,
    sourceBg: CL.sourceKev.bg,
    title: "CISA Known Exploited — Log4j RCE",
    snippet:
      "Added to CISA KEV catalog December 10, 2021. Remediation due date: December 24, 2021. Linked to ransomware campaigns.",
    date: "Dec 2021",
  },
  {
    source: "CVE",
    sourceColor: CL.red400,
    sourceBg: CL.sourceNvd.bg,
    title: "CVE-2021-45105 — Log4j2 Recursive Lookup DoS",
    snippet:
      "Apache Log4j2 versions 2.0-alpha1 through 2.16.0 did not protect from uncontrolled recursion from self-referential lookups, allowing denial of service.",
    date: "Dec 2021",
    cvss: "7.5",
  },
  {
    source: "OWASP",
    sourceColor: CL.blue400,
    sourceBg: CL.sourceOwasp.bg,
    title: "A06:2021 — Vulnerable and Outdated Components",
    snippet:
      "Components such as libraries, frameworks, and other modules run with the same privileges as the application. Log4Shell is a prime example of this category.",
    date: "Sep 2021",
  },
  {
    source: "CVE",
    sourceColor: CL.red400,
    sourceBg: CL.sourceNvd.bg,
    title: "CVE-2021-44832 — Log4j2 JDBC Appender RCE",
    snippet:
      "Apache Log4j2 versions 2.0-beta7 through 2.17.0 are vulnerable to a remote code execution attack where an attacker with permission to modify the logging config file.",
    date: "Dec 2021",
    cvss: "6.6",
  },
];

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { frame: 0, x: 960, y: 540, scale: 1 },
  { frame: 60, x: 960, y: 540, scale: 1 },
  { frame: 90, x: 400, y: 220, scale: 1.15 },
  { frame: 170, x: 400, y: 220, scale: 1.15 },
  { frame: 210, x: 960, y: 540, scale: 1 },
  { frame: 360, x: 960, y: 540, scale: 1 },
];

function SourceDot({ bg }: { bg: string }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        background: bg,
      }}
    />
  );
}

function NvdLogo({ size = 16 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 48 48" width={size}>
      <path d="M24 4L8 13v22l16 9 16-9V13L24 4Z" fill="#002868" />
      <circle cx="18" cy="20" fill="#FFF" r="2" />
      <circle cx="24" cy="20" fill="#FFF" r="2" />
      <circle cx="30" cy="20" fill="#FFF" r="2" />
      <circle cx="18" cy="28" fill="#FFF" r="2" />
      <circle cx="24" cy="28" fill="#FFF" r="2" />
      <circle cx="30" cy="28" fill="#FFF" r="2" />
      <path d="M18 22v4M24 22v4M30 22v4" stroke="#FFF" strokeWidth="1.2" />
    </svg>
  );
}

function MitreLogo({ size = 16 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 48 48" width={size}>
      <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="6" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="6" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="6" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="19" />
      <rect fill="#D4604A" height="10" rx="2" width="10" x="19" y="19" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="19" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="32" />
      <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="32" />
      <rect fill="#D4604A" height="10" rx="2" width="10" x="32" y="32" />
    </svg>
  );
}

function CisaLogo({ size = 16 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 48 48" width={size}>
      <path
        d="M24 4L8 12v12c0 10.667 6.667 20 16 24 9.333-4 16-13.333 16-24V12L24 4Z"
        fill="#BF0A30"
      />
      <rect fill="#FFF" height="12" rx="1.5" width="3" x="22.5" y="15" />
      <circle cx="24" cy="32" fill="#FFF" r="2" />
    </svg>
  );
}

function OwaspLogo({ size = 16 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 48 48" width={size}>
      <circle cx="24" cy="24" r="19" stroke="#1D7AD7" strokeWidth="2.5" />
      <ellipse
        cx="24"
        cy="24"
        rx="8"
        ry="19"
        stroke="#1D7AD7"
        strokeWidth="1.5"
      />
      <path d="M5 24h38" stroke="#1D7AD7" strokeWidth="1.5" />
      <path d="M8 14h32M8 34h32" stroke="#1D7AD7" strokeWidth="1" />
      <rect fill="#1D7AD7" height="11" rx="3" width="14" x="17" y="17" />
      <rect fill="#FFF" height="4" rx="0.5" width="1.5" x="23.25" y="20" />
      <circle cx="24" cy="26" fill="#FFF" r="1" />
    </svg>
  );
}

function SourceLogo({ source }: { source: string }) {
  if (source === "CVE") return <NvdLogo />;
  if (source === "ATT&CK") return <MitreLogo />;
  if (source === "KEV") return <CisaLogo />;
  return <OwaspLogo />;
}

export const SceneResults: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const aiChars = Math.min(
    AI_OVERVIEW_TEXT.length,
    Math.max(0, Math.floor((frame - 20) * 4))
  );
  const aiText = AI_OVERVIEW_TEXT.slice(0, aiChars);
  const aiDone = aiChars >= AI_OVERVIEW_TEXT.length;

  const bulletsVisible = aiDone;
  const citationsVisible = frame >= 140;

  const resultsStartFrame = 160;

  return (
    <AbsoluteFill style={{ background: CL.bg }}>
      <Camera height={1080} keyframes={CAMERA_KEYFRAMES} width={1920}>
        <AbsoluteFill style={{ opacity: pageOpacity }}>
          <div style={{ display: "flex", height: "100%" }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 48,
                  gap: 12,
                  border: `1px solid ${CL.borderSubtle}`,
                  background: CL.bg,
                  padding: "0 16px",
                }}
              >
                <SearchIcon color={`${CL.fg}66`} size={18} />
                <span
                  style={{
                    flex: 1,
                    fontFamily: CLF.sans,
                    fontSize: 15,
                    color: CL.fg,
                  }}
                >
                  log4shell critical vulnerabilities
                </span>
                <CloseIcon color={`${CL.fg}66`} size={16} />
              </div>

              <div
                style={{
                  padding: "6px 12px",
                  opacity: interpolate(frame, [8, 16], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <span
                  style={{
                    fontFamily: CLF.mono,
                    fontSize: 10,
                    color: `${CL.fgMuted}99`,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  52 results in 42ms
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  padding: "0 12px",
                }}
              >
                {frame >= 14 && (
                  <div
                    style={{
                      border: `1px solid ${CL.borderSubtle}`,
                      background: `${CL.card}80`,
                      borderRadius: 6,
                      padding: 16,
                      marginBottom: 24,
                      opacity: interpolate(frame, [14, 24], [0, 1], {
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <SparklesIcon color={CL.primary} size={16} />
                        <span
                          style={{
                            fontFamily: CLF.sans,
                            fontSize: 14,
                            fontWeight: 500,
                            color: CL.fg,
                          }}
                        >
                          AI Overview
                        </span>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: CL.radiusSm,
                            background: CL.muted,
                            fontFamily: CLF.mono,
                            fontSize: 10,
                            color: CL.fgMuted,
                          }}
                        >
                          96% grounded
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ChevronUpIcon color={CL.fgMuted} size={14} />
                        <CloseIcon color={CL.fgMuted} size={14} />
                      </div>
                    </div>

                    <p
                      style={{
                        fontFamily: CLF.sans,
                        fontSize: 13,
                        color: CL.fg,
                        lineHeight: 1.7,
                        marginBottom: bulletsVisible ? 12 : 0,
                      }}
                    >
                      {aiText}
                      {!aiDone && <span style={{ color: CL.fgGhost }}>▊</span>}
                    </p>

                    {bulletsVisible && (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {AI_OVERVIEW_BULLETS.map((b, i) => {
                          const bOpacity = interpolate(
                            frame,
                            [110 + i * 4, 118 + i * 4],
                            [0, 1],
                            { extrapolateRight: "clamp" }
                          );
                          return (
                            <li
                              key={b.bold}
                              style={{
                                fontFamily: CLF.sans,
                                fontSize: 13,
                                color: CL.fg,
                                lineHeight: 1.7,
                                marginBottom: 4,
                                opacity: bOpacity,
                              }}
                            >
                              <strong>{b.bold}</strong> {b.text}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {citationsVisible && (
                      <div
                        style={{
                          borderTop: `1px solid ${CL.borderSubtle}`,
                          paddingTop: 12,
                          marginTop: 12,
                          opacity: interpolate(frame, [140, 150], [0, 1], {
                            extrapolateRight: "clamp",
                          }),
                        }}
                      >
                        <div
                          style={{
                            fontFamily: CLF.sans,
                            fontSize: 11,
                            fontWeight: 500,
                            color: CL.fgMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 8,
                          }}
                        >
                          SOURCES
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {AI_CITATIONS.map((c) => (
                            <div
                              key={c.num}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: CL.radius,
                                background: CL.muted,
                                fontFamily: CLF.sans,
                                fontSize: 11,
                                color: CL.fgMuted,
                              }}
                            >
                              <span style={{ color: CL.fgGhost }}>
                                [{c.num}]
                              </span>
                              <SourceLogo source={c.source} />
                              <span>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {RESULTS.map((result, i) => {
                  const rowStart = resultsStartFrame + i * 10;
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
                  const rowY = interpolate(rowProgress, [0, 1], [8, 0]);

                  return (
                    <div
                      key={result.title}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 12px",
                        opacity: rowOpacity,
                        transform: `translateY(${rowY}px)`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          background: `${CL.fg}08`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SourceLogo source={result.source} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontFamily: CLF.mono,
                            fontSize: 10,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              color: `${CL.fg}66`,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {result.source}
                          </span>
                          <span
                            style={{ color: `${CL.fg}33`, margin: "0 6px" }}
                          >
                            ·
                          </span>
                          <span style={{ color: `${CL.fg}50` }}>
                            {SOURCE_ORG[result.source] ?? result.source}
                          </span>
                          <span
                            style={{ color: `${CL.fg}4D`, marginLeft: "auto" }}
                          >
                            {result.date}
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: CLF.sans,
                            fontSize: 13,
                            color: `${CL.fg}E6`,
                            lineHeight: 1.4,
                          }}
                        >
                          {result.title}
                        </p>
                        <p
                          style={{
                            fontFamily: CLF.sans,
                            fontSize: 11,
                            color: `${CL.fg}50`,
                            marginTop: 2,
                          }}
                        >
                          Updated {result.date}
                        </p>
                        <p
                          style={{
                            fontFamily: CLF.sans,
                            fontSize: 12,
                            color: `${CL.fg}80`,
                            lineHeight: 1.5,
                            marginTop: 4,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {result.snippet}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside
              style={{
                width: 224,
                flexShrink: 0,
                background: CL.bg,
                display: "flex",
                flexDirection: "column",
                opacity: interpolate(frame, [5, 15], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  fontFamily: CLF.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  color: `${CL.fg}99`,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                SOURCES
              </div>
              {SOURCES.map((source) => (
                <div
                  key={source.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 16px",
                    fontFamily: CLF.sans,
                    fontSize: 12,
                  }}
                >
                  <SourceDot bg={source.color.text} />
                  <span style={{ flex: 1, color: CL.fg }}>{source.label}</span>
                  <span
                    style={{
                      fontFamily: CLF.mono,
                      fontSize: 10,
                      color: `${CL.fg}66`,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {source.count}
                  </span>
                </div>
              ))}
            </aside>
          </div>
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};
