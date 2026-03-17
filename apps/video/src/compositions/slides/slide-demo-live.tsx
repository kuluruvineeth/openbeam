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
import { BlurReveal } from "../../components/blur-reveal";
import { CameraMove } from "../../components/camera-move";
import { ChromaticAberration } from "../../components/chromatic-aberration";
import { Counter } from "../../components/counter";
import { GrainOverlay } from "../../components/grain-overlay";
import { PulseRing } from "../../components/pulse-ring";
import { TextReveal } from "../../components/text-reveal";
import { Vignette } from "../../components/vignette";
import { CONNECTOR_LOGOS } from "../../lib/connector-logos";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const SOURCE_COLORS = {
  NVD: "#ef4444",
  "CISA KEV": "#f97316",
  "MITRE ATT&CK": "#a855f7",
  OWASP: "#3b82f6",
} as const;

const HERO_CARDS = [
  {
    id: "CVE-2021-44228",
    title: "Apache Log4j2 JNDI Remote Code Execution",
    meta: "CVSS 10.0 \u00b7 Dec 2021 \u00b7 Actively exploited",
  },
  {
    id: "T1190",
    title: "Exploit Public-Facing Application",
    meta: "Initial Access \u00b7 Enterprise \u00b7 23 groups",
  },
  {
    id: "Cheat Sheet",
    title: "SQL Injection Prevention",
    meta: "Input validation \u00b7 Parameterized queries",
  },
  {
    id: "CISA KEV",
    title: "Known Exploited Vulnerabilities Catalog",
    meta: "1,500+ entries \u00b7 Ransomware-linked",
  },
] as const;

const SEARCH_RESULTS = [
  {
    type: "ADVISORY",
    cve: "CVE-2017-8543",
    title: "Microsoft Windows Search Remote Code Execution Vulnerability",
    date: "May 24, 2022",
    snippet:
      "Microsoft Windows allows an attacker to take control of the affected system when Windows Search fails to handle objects in memory...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2023-36884",
    title: "Microsoft Windows Search Remote Code Execution Vulnerability",
    date: "Jul 17, 2023",
    snippet:
      "Microsoft is investigating reports of a series of remote code execution vulnerabilities impacting Windows and Office products...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2021-44026",
    title: "Roundcube Webmail SQL Injection",
    date: "Jun 22, 2023",
    snippet:
      "Roundcube before 1.3.17 and 1.4.x before 1.4.12 allows SQL injection via search or search_params...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2020-3153",
    title: "Cisco AnyConnect Secure Mobility Client Arbitrary File Overwrite",
    date: "Oct 24, 2022",
    snippet:
      "A vulnerability in the installer component of Cisco AnyConnect Secure Mobility Client for Windows...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2015-1427",
    title: "Elasticsearch Groovy Scripting Engine RCE",
    date: "Mar 25, 2022",
    snippet:
      "The Groovy scripting engine in Elasticsearch before 1.3.8 and 1.4.x before 1.4.3 allows remote attackers...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2014-3120",
    title: "Elasticsearch Remote Code Execution",
    date: "Mar 25, 2022",
    snippet:
      "The default configuration in Elasticsearch before 1.2 enables dynamic scripting, which allows remote attackers...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2021-30633",
    title: "Google Chromium Indexed DB Use After Free",
    date: "Nov 3, 2021",
    snippet:
      "Use after free in Indexed DB in Google Chrome prior to 93.0.4577.82 allowed a remote attacker...",
    color: SOURCE_COLORS.NVD,
  },
  {
    type: "ADVISORY",
    cve: "CVE-2022-22965",
    title: "Spring Framework RCE via Data Binding",
    date: "Apr 1, 2022",
    snippet:
      "A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution...",
    color: SOURCE_COLORS.NVD,
  },
] as const;

const DETAIL_CONTENT =
  "Microsoft Windows allows an attacker to take control of the affected system when Windows Search fails to handle objects in memory. Required Action: Apply updates per vendor instructions. Vendor: Microsoft Product: Windows Date Added: 2022-05-24 Due Date: 2022-06-14 Ransomware Campaign Use: Unknown CWEs: CWE-281 Notes: https://nvd.nist.gov/vuln/detail/CVE-2017-8543";

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function seededChar(seed: number): string {
  const idx =
    Math.abs(Math.floor(Math.sin(seed * 9301 + 49_297) * 49_297)) %
    SCRAMBLE_CHARS.length;
  return SCRAMBLE_CHARS[idx];
}

const InlineScramble: React.FC<{
  text: string;
  startFrame: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, durationFrames = 20, style }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  if (elapsed < 0) {
    return null;
  }

  const progress = Math.min(1, elapsed / durationFrames);
  const resolved = Math.floor(progress * text.length);

  const chars = text.split("").map((ch, i) => {
    if (ch === " ") {
      return ch;
    }
    if (i < resolved) {
      return ch;
    }
    if (progress >= 1) {
      return ch;
    }
    return seededChar(frame * 100 + i);
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <span style={{ opacity, ...style }}>{chars.join("")}</span>;
};

const SearchIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = BRAND.fgMuted,
}) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
  <svg
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const HeroCard: React.FC<{
  card: (typeof HERO_CARDS)[number];
  index: number;
  startFrame: number;
}> = ({ card, index, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - (startFrame + index * 6),
    fps,
    config: { damping: 22, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(progress, [0, 1], [24, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        padding: 20,
        background: BRAND.card,
        border: "1px solid rgba(28,28,28,0.4)",
        borderRadius: 6,
        transform: `translateY(${translateY}px)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{ fontFamily: FONTS.mono, fontSize: 11, color: BRAND.fgMuted }}
      >
        {card.id}
      </span>
      <span
        style={{
          fontFamily: FONTS.sans,
          fontSize: 15,
          color: BRAND.fg,
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {card.title}
      </span>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: BRAND.fgMuted,
          lineHeight: 1.3,
        }}
      >
        {card.meta}
      </span>
    </div>
  );
};

const SearchResultRow: React.FC<{
  result: (typeof SEARCH_RESULTS)[number];
  index: number;
  startFrame: number;
  dimmed?: boolean;
}> = ({ result, index, startFrame, dimmed = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - (startFrame + index * 4),
    fps,
    config: { damping: 24, stiffness: 130, mass: 0.7 },
  });

  const translateY = interpolate(progress, [0, 1], [16, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const isFirst = index === 0;

  return (
    <div
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid rgba(28,28,28,0.2)",
        transform: `translateY(${translateY}px)`,
        opacity: opacity * (dimmed ? 0.5 : 1),
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        background: isFirst && !dimmed ? "transparent" : "transparent",
        borderLeft:
          isFirst && !dimmed
            ? "2px solid rgba(250,250,250,0.2)"
            : "2px solid transparent",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: result.color,
          flexShrink: 0,
          marginTop: 4,
        }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: BRAND.fgMuted,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          {result.type}
        </span>
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            color: BRAND.fg,
            lineHeight: 1.4,
          }}
        >
          {result.cve}: {result.title}
        </span>
        <span
          style={{ fontFamily: FONTS.sans, fontSize: 12, color: BRAND.fgMuted }}
        >
          Updated {result.date}
        </span>
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 12,
            color: "rgba(250,250,250,0.5)",
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
          }}
        >
          {result.snippet}
        </span>
      </div>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: BRAND.fgMuted,
          flexShrink: 0,
          marginTop: 4,
        }}
      >
        {result.date}
      </span>
    </div>
  );
};

const DetailPanel: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 24, stiffness: 100, mass: 0.9 },
  });

  const translateX = interpolate(slideProgress, [0, 1], [300, 0]);
  const opacity = interpolate(slideProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const contentChars = DETAIL_CONTENT.length;
  const contentRevealed = Math.floor(
    interpolate(frame, [startFrame + 15, startFrame + 80], [0, contentChars], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "55%",
        height: "100%",
        background: BRAND.card,
        borderLeft: `1px solid ${BRAND.border}`,
        transform: `translateX(${translateX}px)`,
        opacity,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 600,
              color: SOURCE_COLORS["CISA KEV"],
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.2)",
              padding: "2px 8px",
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            KEV
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              color: BRAND.fg,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}
          >
            CVE-2017-8543: Microsoft Windows Search Remote Code Execution
            Vulnerabi...
          </span>
        </div>
        <div
          style={{ display: "flex", gap: 12, flexShrink: 0, marginLeft: 16 }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: BRAND.fgMuted,
              cursor: "pointer",
            }}
          >
            &lt;
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: BRAND.fgMuted,
              cursor: "pointer",
            }}
          >
            &gt;
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: BRAND.fgMuted,
              cursor: "pointer",
            }}
          >
            &times;
          </span>
        </div>
      </div>

      {/* Metadata grid */}
      <div style={{ display: "flex", gap: 40, paddingTop: 4 }}>
        {(
          [
            ["TYPE", "advisory"],
            ["PUBLISHED", "May 24, 2022"],
            ["UPDATED", "May 24, 2022"],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: BRAND.fgMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}
            >
              {label}
            </span>
            <span
              style={{ fontFamily: FONTS.sans, fontSize: 14, color: BRAND.fg }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          paddingTop: 20,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            color: BRAND.fg,
            lineHeight: 1.7,
          }}
        >
          {DETAIL_CONTENT.slice(0, contentRevealed)}
          {contentRevealed < contentChars && (
            <span
              style={{
                opacity:
                  Math.round(((frame - startFrame) % 16) / 16) === 0 ? 1 : 0.3,
                color: BRAND.fgMuted,
              }}
            >
              |
            </span>
          )}
        </span>
      </div>

      {/* Source */}
      <div
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: BRAND.fgMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          SOURCE
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
          <svg
            fill="none"
            height="14"
            stroke={BRAND.fgMuted}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span
            style={{ fontFamily: FONTS.sans, fontSize: 14, color: BRAND.fg }}
          >
            https://nvd.nist.gov/vuln/detail/CVE-2017-8543
          </span>
        </div>
      </div>
    </div>
  );
};

const AI_OVERVIEW_TEXT_P1 =
  "Log4Shell (CVE-2021-44228) is a critical remote code execution vulnerability in Apache Log4j2, affecting versions 2.0-beta9 through 2.14.1 [1]. The vulnerability allows attackers to execute arbitrary code by sending specially crafted log messages [1], [2].";
const AI_OVERVIEW_TEXT_P2 = "Key impacts include:";
const AI_OVERVIEW_BULLETS = [
  "Remote code execution via JNDI lookup injection [1]",
  "CVSS score of 10.0 — maximum severity [2]",
  "Actively exploited in the wild since December 2021 [1], [2]",
] as const;

const BOLD_PHRASES = [
  "remote code execution",
  "CVSS score of 10.0",
  "Actively exploited",
] as const;

const _TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  wordsPerFrame?: number;
  boldPhrases?: readonly string[];
  style?: React.CSSProperties;
}> = ({ text, startFrame, wordsPerFrame = 0.6, boldPhrases = [], style }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  if (elapsed < 0) {
    return null;
  }

  const words = text.split(" ");
  const visibleCount = Math.min(
    words.length,
    Math.floor(elapsed * wordsPerFrame)
  );
  const visibleText = words.slice(0, visibleCount).join(" ");

  const renderWithBold = (str: string) => {
    if (boldPhrases.length === 0) {
      return str;
    }
    const parts: { text: string; bold: boolean }[] = [];
    let remaining = str;
    while (remaining.length > 0) {
      let earliest = -1;
      let earliestPhrase = "";
      for (const phrase of boldPhrases) {
        const idx = remaining.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx !== -1 && (earliest === -1 || idx < earliest)) {
          earliest = idx;
          earliestPhrase = phrase;
        }
      }
      if (earliest === -1) {
        parts.push({ text: remaining, bold: false });
        break;
      }
      if (earliest > 0) {
        parts.push({ text: remaining.slice(0, earliest), bold: false });
      }
      parts.push({
        text: remaining.slice(earliest, earliest + earliestPhrase.length),
        bold: true,
      });
      remaining = remaining.slice(earliest + earliestPhrase.length);
    }
    return parts.map((p, i) => (
      <span
        key={i}
        style={{
          color: p.bold ? BRAND.fg : undefined,
          fontWeight: p.bold ? 600 : undefined,
        }}
      >
        {p.text}
      </span>
    ));
  };

  return (
    <span style={style}>
      {renderWithBold(visibleText)}
      {visibleCount < words.length && (
        <span style={{ opacity: 0.5, color: BRAND.fgMuted }}>|</span>
      )}
    </span>
  );
};

const AI_FULL_TEXT = [
  AI_OVERVIEW_TEXT_P1,
  "",
  AI_OVERVIEW_TEXT_P2,
  `  \u2022 ${AI_OVERVIEW_BULLETS[0]}`,
  `  \u2022 ${AI_OVERVIEW_BULLETS[1]}`,
  `  \u2022 ${AI_OVERVIEW_BULLETS[2]}`,
].join("\n");

function renderOverviewLine(line: string): React.ReactNode {
  let remaining = line;
  const parts: { text: string; bold: boolean }[] = [];
  while (remaining.length > 0) {
    let earliest = -1;
    let earliestPhrase = "";
    for (const phrase of BOLD_PHRASES) {
      const idx = remaining.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestPhrase = phrase;
      }
    }
    if (earliest === -1) {
      parts.push({ text: remaining, bold: false });
      break;
    }
    if (earliest > 0) {
      parts.push({ text: remaining.slice(0, earliest), bold: false });
    }
    parts.push({
      text: remaining.slice(earliest, earliest + earliestPhrase.length),
      bold: true,
    });
    remaining = remaining.slice(earliest + earliestPhrase.length);
  }
  return parts.map((p, i) => (
    <span
      key={i}
      style={{
        color: p.bold ? BRAND.fg : undefined,
        fontWeight: p.bold ? 600 : undefined,
      }}
    >
      {p.text}
    </span>
  ));
}

const AIOverviewPanel: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  const _maxHeight = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0, 520],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const opacity = interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contentStartFrame = startFrame + 3;
  const totalChars = AI_FULL_TEXT.length;
  const charsVisible = Math.min(
    totalChars,
    Math.max(0, Math.floor((frame - contentStartFrame) * 2.5))
  );
  const visibleText = AI_FULL_TEXT.slice(0, charsVisible);
  const showCursor = charsVisible < totalChars && charsVisible > 0;

  const showSources = frame >= startFrame + 30;

  return (
    <div
      style={{
        margin: "0 24px 16px 24px",
        opacity,
      }}
    >
      <div
        style={{
          background: BRAND.card,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 8,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, color: BRAND.fg }}>{"\u2726"}</span>
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 14,
                color: BRAND.fg,
                fontWeight: 700,
              }}
            >
              AI Overview
            </span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: BRAND.fgMuted,
                background: `${BRAND.fg}0a`,
                border: `1px solid ${BRAND.fg}15`,
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              88% grounded
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: BRAND.fgMuted,
              }}
            >
              ^
            </span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: BRAND.fgMuted,
              }}
            >
              &times;
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {visibleText.split("\n").map((line, i) => (
            <span
              key={i}
              style={{
                fontFamily: FONTS.sans,
                fontSize: 14,
                color: BRAND.fgMuted,
                lineHeight: 1.7,
                display: "block",
                minHeight: line === "" ? 8 : undefined,
              }}
            >
              {renderOverviewLine(line)}
              {i === visibleText.split("\n").length - 1 && showCursor && (
                <span style={{ opacity: 0.5, color: BRAND.fgMuted }}>|</span>
              )}
            </span>
          ))}
        </div>

        {showSources && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderTop: `1px solid ${BRAND.border}`,
              paddingTop: 12,
              opacity: interpolate(
                frame,
                [startFrame + 30, startFrame + 35],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }
              ),
            }}
          >
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: BRAND.fgMuted,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}
            >
              SOURCES
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                "[1] CVE-2021-44228 — KEV Advisory",
                "[2] CVE-2021-44228 — NVD Detail",
              ].map((src) => (
                <span
                  key={src}
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    color: BRAND.fg,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 4,
                    padding: "4px 12px",
                    display: "inline-flex",
                  }}
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CONNECTOR_RING_DATA = (() => {
  const inner = [
    { name: "Slack", color: BRAND.blue },
    { name: "Gmail", color: BRAND.blue },
    { name: "GitHub", color: BRAND.blue },
    { name: "Notion", color: BRAND.blue },
    { name: "Linear", color: BRAND.blue },
    { name: "Google Drive", color: BRAND.blue },
  ];
  const middle = [
    { name: "Jira", color: BRAND.blue },
    { name: "Confluence", color: BRAND.blue },
    { name: "Samsara", color: BRAND.green },
    { name: "MQTT", color: BRAND.green },
    { name: "OPC-UA", color: BRAND.green },
    { name: "BACnet", color: BRAND.green },
    { name: "ThingsBoard", color: BRAND.green },
    { name: "Node-RED", color: BRAND.green },
  ];
  const outer = [
    { name: "Omniverse", color: BRAND.pink },
    { name: "Matterport", color: BRAND.pink },
    { name: "Viam", color: BRAND.pink },
    { name: "FHIR", color: BRAND.pink },
    { name: "NVD", color: BRAND.orange },
    { name: "CISA KEV", color: BRAND.orange },
    { name: "MITRE ATT&CK", color: BRAND.orange },
    { name: "OWASP", color: BRAND.orange },
  ];

  const result: {
    name: string;
    color: string;
    radius: number;
    angle: number;
    globalIndex: number;
  }[] = [];
  let idx = 0;
  for (const [items, radius] of [
    [inner, 200],
    [middle, 350],
    [outer, 480],
  ] as const) {
    for (let i = 0; i < items.length; i += 1) {
      const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      result.push({ ...items[i], radius, angle, globalIndex: idx });
      idx += 1;
    }
  }
  return result;
})();

const ConnectorCard: React.FC<{
  connector: (typeof CONNECTOR_RING_DATA)[number];
  burstFrame: number;
}> = ({ connector, burstFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = burstFrame + connector.globalIndex * 3;
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 200, mass: 0.7 },
  });

  const cx = 960;
  const cy = 540;
  const finalX = cx + connector.radius * Math.cos(connector.angle) - 60;
  const finalY = cy + connector.radius * Math.sin(connector.angle) - 24;

  const x = interpolate(progress, [0, 1], [cx - 60, finalX]);
  const y = interpolate(progress, [0, 1], [cy - 24, finalY]);
  const scale = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const LogoComponent = CONNECTOR_LOGOS[connector.name];

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 120,
        height: 48,
        background: BRAND.card,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 0 20px ${connector.color}15`,
      }}
    >
      {LogoComponent ? (
        <LogoComponent size={24} />
      ) : (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connector.color,
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 13,
          color: BRAND.fg,
          whiteSpace: "nowrap" as const,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {connector.name}
      </span>
    </div>
  );
};

export const SlideDemoLive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global fade-in from black
  const grainOpacity = interpolate(frame, [0, 10], [0, 0.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeToBlack = interpolate(frame, [760, 780], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ACT 2: Landing page fade in
  const landingFadeIn = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Typing state
  const typedText = "log4shell";
  const typingStartFrame = 125;
  const charsPerFrame = 0.8;
  const charsTyped =
    frame >= typingStartFrame
      ? Math.min(
          typedText.length,
          Math.floor((frame - typingStartFrame) * charsPerFrame)
        )
      : 0;
  const typingDone = charsTyped >= typedText.length;

  // ACT 3: Transition from landing to search
  const transitionStart = 145;
  const heroFadeOut = interpolate(
    frame,
    [transitionStart, transitionStart + 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const headerSlideOut = interpolate(
    frame,
    [transitionStart, transitionStart + 10],
    [0, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const headerFadeOut = interpolate(
    frame,
    [transitionStart, transitionStart + 8],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const searchBarMoveProgress = spring({
    frame: frame - transitionStart,
    fps,
    config: { damping: 22, stiffness: 100, mass: 0.9 },
  });

  // ACT 4: Results visible
  const resultsStartFrame = 160;

  // ACT 5: Detail panel
  const detailStartFrame = 285;
  const showDetail = frame >= 280;
  const _firstRowHighlight = frame >= 280;
  const detailDim = showDetail
    ? interpolate(frame, [280, 290], [1, 0.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // ACT 6: Blur-fade everything
  const act6BlurOut = interpolate(frame, [420, 435], [0, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const act6FadeOut = interpolate(frame, [420, 435], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ACT 6: Scale text
  const showScaleText = frame >= 435;

  // ACT 7: CTA
  const showCta = frame >= 680;
  const ctaFadeIn = interpolate(frame, [680, 690], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phases
  const showLanding = frame >= 40 && frame < transitionStart;
  const showSearchView = frame >= transitionStart && frame < 420;
  const showProduct = frame >= 40 && frame < 435;

  // Search bar position interpolation
  const searchBarTop = showSearchView
    ? interpolate(searchBarMoveProgress, [0, 1], [440, 50])
    : 440;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity: fadeToBlack }}>
        <GrainOverlay opacity={grainOpacity} />

        {/* ACT 1: COLD OPEN */}
        {frame < 40 && (
          <AbsoluteFill>
            {frame >= 10 && (
              <div style={{ position: "absolute", top: 40, left: 48 }}>
                <BlurReveal maxBlur={12} startFrame={10}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      fontWeight: 600,
                      color: BRAND.blue,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    LIVE
                  </span>
                </BlurReveal>
              </div>
            )}
            {frame >= 15 && (
              <div style={{ position: "absolute", top: 62, left: 48 }}>
                <BlurReveal maxBlur={10} startFrame={15}>
                  <span
                    style={{
                      fontFamily: FONTS.serif,
                      fontSize: 20,
                      color: BRAND.fgMuted,
                    }}
                  >
                    app.openbeam.work/explore
                  </span>
                </BlurReveal>
              </div>
            )}
          </AbsoluteFill>
        )}

        {/* ACT 2-5: THE PRODUCT (full 1920x1080, no browser frame) */}
        {showProduct && (
          <AbsoluteFill
            style={{
              opacity: landingFadeIn * act6FadeOut,
              filter: `blur(${act6BlurOut}px)`,
            }}
          >
            {/* Top banner / marquee */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 32,
                background: "#111111",
                borderBottom: `1px solid ${BRAND.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 12,
                    color: BRAND.fgMuted,
                  }}
                >
                  You're searching 264K+ public security docs right now
                </span>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    color: BRAND.fgMuted,
                  }}
                >
                  NVD &middot; MITRE ATT&CK &middot; OWASP &middot; CISA KEV
                </span>
              </div>
            </div>

            {/* Landing page center content */}
            {showLanding && (
              <div
                style={{
                  position: "absolute",
                  top: 60,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `translateY(${headerSlideOut}px)`,
                  opacity: heroFadeOut * headerFadeOut,
                  paddingBottom: 480,
                }}
              >
                {/* Logo */}
                <BlurReveal maxBlur={14} startFrame={42}>
                  <Img
                    src={staticFile("logo_dark.png")}
                    style={{ width: 40, height: 40, marginBottom: 20 }}
                  />
                </BlurReveal>

                {/* Title */}
                <BlurReveal maxBlur={14} startFrame={44}>
                  <span
                    style={{
                      fontFamily: FONTS.serif,
                      fontSize: 80,
                      color: BRAND.fg,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    OpenBeam
                  </span>
                </BlurReveal>

                {/* Subtitle */}
                <BlurReveal maxBlur={12} startFrame={48}>
                  <span
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 18,
                      color: BRAND.fgMuted,
                      marginTop: 12,
                    }}
                  >
                    Search vulnerabilities, techniques, and security guides
                  </span>
                </BlurReveal>
              </div>
            )}

            {/* Search bar (animates from center to top) */}
            {frame >= 40 && frame < 420 && (
              <div
                style={{
                  position: "absolute",
                  top: showSearchView ? searchBarTop : undefined,
                  left: "50%",
                  transform: `translateX(-50%)${showSearchView ? "" : ` translateY(${searchBarTop}px)`}`,
                  width: showSearchView
                    ? interpolate(searchBarMoveProgress, [0, 1], [600, 880])
                    : 600,
                  zIndex: 10,
                }}
              >
                <BlurReveal maxBlur={10} startFrame={52}>
                  <div
                    style={{
                      width: "100%",
                      height: showSearchView
                        ? interpolate(searchBarMoveProgress, [0, 1], [52, 44])
                        : 52,
                      background: BRAND.card,
                      border: `1px solid ${charsTyped > 0 ? `${BRAND.blue}60` : BRAND.border}`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 18px",
                      gap: 12,
                    }}
                  >
                    <SearchIcon size={18} />
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 15,
                        color: charsTyped > 0 ? BRAND.fg : BRAND.fgMuted,
                        flex: 1,
                      }}
                    >
                      {charsTyped > 0 ? (
                        <>
                          {typedText.slice(0, charsTyped)}
                          {!typingDone && (
                            <span
                              style={{
                                opacity:
                                  Math.round(
                                    ((frame - typingStartFrame) % 16) / 16
                                  ) === 0
                                    ? 1
                                    : 0.2,
                                color: BRAND.blue,
                              }}
                            >
                              |
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          log4shell, SQL injection, T1190...
                          {frame >= 120 && frame < 125 && (
                            <span
                              style={{
                                opacity: interpolate(
                                  frame,
                                  [120, 122],
                                  [0, 1],
                                  {
                                    extrapolateLeft: "clamp",
                                    extrapolateRight: "clamp",
                                  }
                                ),
                                color: BRAND.fg,
                                marginLeft: -2,
                              }}
                            >
                              |
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </BlurReveal>
              </div>
            )}

            {/* Hero cards (landing only) */}
            {showLanding && (
              <div
                style={{
                  position: "absolute",
                  top: 530,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 620,
                  display: "flex",
                  flexWrap: "wrap" as const,
                  gap: 12,
                  opacity: heroFadeOut,
                }}
              >
                <div style={{ display: "flex", gap: 12, width: "100%" }}>
                  <HeroCard card={HERO_CARDS[0]} index={0} startFrame={58} />
                  <HeroCard card={HERO_CARDS[1]} index={1} startFrame={58} />
                </div>
                <div style={{ display: "flex", gap: 12, width: "100%" }}>
                  <HeroCard card={HERO_CARDS[2]} index={0} startFrame={68} />
                  <HeroCard card={HERO_CARDS[3]} index={1} startFrame={68} />
                </div>
              </div>
            )}

            {/* Footer sources (landing only) */}
            {showLanding && (
              <div
                style={{
                  position: "absolute",
                  bottom: 40,
                  left: 0,
                  right: 0,
                  textAlign: "center" as const,
                  opacity: heroFadeOut * 0.3,
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    color: BRAND.fgMuted,
                  }}
                >
                  NVD &middot; MITRE ATT&CK &middot; OWASP &middot; CISA KEV
                </span>
              </div>
            )}

            {/* Search results view */}
            {showSearchView && frame >= 155 && (
              <div
                style={{
                  position: "absolute",
                  top: 108,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                }}
              >
                {/* Results count */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <InlineScramble
                      durationFrames={18}
                      startFrame={resultsStartFrame}
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 11,
                        color: BRAND.fgMuted,
                        letterSpacing: "0.05em",
                      }}
                      text="41 results in 10ms"
                    />
                  </div>

                  {/* AI Overview */}
                  {frame >= 175 && <AIOverviewPanel startFrame={175} />}

                  {/* Results list */}
                  <CameraMove
                    durationFrames={80}
                    intensity={0.4}
                    startFrame={200}
                    type="zoom"
                  >
                    <div style={{ opacity: detailDim }}>
                      {SEARCH_RESULTS.map((result, i) => (
                        <SearchResultRow
                          dimmed={showDetail && i > 0}
                          index={i}
                          key={i}
                          result={result}
                          startFrame={resultsStartFrame + 4}
                        />
                      ))}
                    </div>
                  </CameraMove>
                </div>

                {/* Right sidebar (sources) */}
                {!showDetail && (
                  <div
                    style={{
                      width: 200,
                      padding: "12px 24px",
                      borderLeft: `1px solid ${BRAND.border}`,
                      opacity: interpolate(frame, [185, 195], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 11,
                        color: BRAND.fgMuted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.15em",
                      }}
                    >
                      SOURCES
                    </span>
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: SOURCE_COLORS["CISA KEV"],
                            }}
                          />
                          <span
                            style={{
                              fontFamily: FONTS.mono,
                              fontSize: 12,
                              color: BRAND.fg,
                            }}
                          >
                            KEV
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: FONTS.mono,
                            fontSize: 11,
                            color: BRAND.fgMuted,
                          }}
                        >
                          20
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detail panel */}
                {showDetail && <DetailPanel startFrame={detailStartFrame} />}
              </div>
            )}

            {/* Vignette during detail view */}
            {frame >= 320 && frame < 420 && (
              <Vignette intensity={0.2} size={0.3} />
            )}

            {/* CameraMove zoom into detail content */}
            {frame >= 360 && frame < 420 && (
              <CameraMove
                durationFrames={60}
                intensity={0.6}
                startFrame={360}
                type="zoom"
              >
                <div />
              </CameraMove>
            )}
          </AbsoluteFill>
        )}

        {/* PulseRing on "10ms" settling */}
        {frame >= 175 && frame < 210 && (
          <PulseRing
            color={BRAND.green}
            count={2}
            size={120}
            staggerFrames={8}
            startFrame={178}
            x={580}
            y={140}
          />
        )}

        {/* ACT 6: THE SCALE EXPLOSION */}
        {showScaleText && frame < 660 && (
          <AbsoluteFill
            style={{
              opacity:
                interpolate(frame, [435, 440], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }) *
                (frame >= 555
                  ? interpolate(frame, [555, 565], [1, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  : 1),
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
                gap: 8,
              }}
            >
              {/* "264K documents." */}
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={56}
                mode="words"
                staggerFrames={4}
                startFrame={440}
                style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                text="264K documents."
              />

              {/* "One query." */}
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={56}
                mode="words"
                staggerFrames={4}
                startFrame={455}
                style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                text="One query."
              />

              {/* "10ms." — SLAMS in */}
              {frame >= 465 && (
                <ChromaticAberration
                  durationFrames={3}
                  offset={6}
                  startFrame={465}
                >
                  <AbsoluteFill
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${interpolate(
                          spring({
                            frame: frame - 465,
                            fps,
                            config: { damping: 14, stiffness: 200, mass: 0.5 },
                          }),
                          [0, 1],
                          [1.3, 1]
                        )})`,
                        marginTop: 140,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONTS.serif,
                          fontSize: 56,
                          color: BRAND.fg,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        10ms.
                      </span>
                    </div>
                  </AbsoluteFill>
                </ChromaticAberration>
              )}

              {/* PulseRing on 10ms */}
              {frame >= 465 && frame < 500 && (
                <PulseRing
                  color={BRAND.blue}
                  count={2}
                  size={300}
                  staggerFrames={6}
                  startFrame={466}
                  x={960}
                  y={600}
                />
              )}

              {/* "Imagine this across your entire enterprise." */}
              {frame >= 480 && (
                <div style={{ marginTop: 60 }}>
                  <TextReveal
                    color={BRAND.fg}
                    fontFamily={FONTS.serif}
                    fontSize={42}
                    mode="words"
                    staggerFrames={3}
                    startFrame={480}
                    style={{
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                      textAlign: "center",
                    }}
                    text="Imagine this across your entire enterprise."
                  />
                </div>
              )}
            </div>
          </AbsoluteFill>
        )}

        {/* CONNECTOR EXPLOSION — separate layer, not inside text fade */}
        {frame >= 560 && frame < 690 && (
          <AbsoluteFill>
            {CONNECTOR_RING_DATA.map((connector) => (
              <ConnectorCard
                burstFrame={560}
                connector={connector}
                key={connector.name}
              />
            ))}

            {frame >= 560 && frame < 562 && (
              <ChromaticAberration
                durationFrames={2}
                offset={4}
                startFrame={560}
              >
                <div />
              </ChromaticAberration>
            )}

            {frame >= 590 && frame < 690 && (
              <PulseRing
                color={BRAND.blue}
                count={3}
                size={1000}
                staggerFrames={8}
                startFrame={590}
                x={960}
                y={540}
              />
            )}

            {frame >= 600 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 100,
                  left: 0,
                  right: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Counter
                  color={BRAND.fg}
                  durationFrames={25}
                  fontFamily={FONTS.mono}
                  fontSize={28}
                  startFrame={600}
                  value="25+ connectors"
                />
                <span
                  style={{
                    fontFamily: FONTS.serif,
                    fontSize: 18,
                    color: BRAND.fgMuted,
                    opacity: interpolate(frame, [605, 611], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  and counting...
                </span>
              </div>
            )}
          </AbsoluteFill>
        )}

        {/* ACT 7: CTA — THE HERO MOMENT */}
        {showCta &&
          (() => {
            const ctaUrlText = "app.openbeam.work/explore";
            const ctaTypingStart = 700;
            const ctaCharsPerFrame = 0.4;
            const ctaCharsVisible = Math.min(
              ctaUrlText.length,
              Math.max(
                0,
                Math.floor((frame - ctaTypingStart) * ctaCharsPerFrame)
              )
            );
            const ctaTypingDone = ctaCharsVisible >= ctaUrlText.length;
            const ctaCursorBlink = Math.floor(frame / 12) % 2 === 0;

            const computeOpacity = interpolate(
              spring({
                frame: frame - 720,
                fps,
                config: { damping: 26, stiffness: 100, mass: 0.8 },
              }),
              [0, 0.5],
              [0, 1],
              { extrapolateRight: "clamp" }
            );

            const tryScale = interpolate(
              spring({
                frame: frame - 683,
                fps,
                config: { damping: 14, stiffness: 40, mass: 1.5 },
              }),
              [0, 1],
              [0.6, 1]
            );
            const tryOpacity = interpolate(
              spring({
                frame: frame - 683,
                fps,
                config: { damping: 20, stiffness: 80, mass: 1 },
              }),
              [0, 0.3],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const tryBlur = interpolate(
              spring({
                frame: frame - 683,
                fps,
                config: { damping: 20, stiffness: 80, mass: 1 },
              }),
              [0, 1],
              [30, 0]
            );

            return (
              <AbsoluteFill style={{ opacity: ctaFadeIn * fadeToBlack }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: 1,
                    gap: 0,
                  }}
                >
                  {/* "Try it now" — MASSIVE */}
                  <div
                    style={{
                      transform: `scale(${tryScale})`,
                      opacity: tryOpacity,
                      filter: `blur(${tryBlur}px)`,
                      willChange: "filter, opacity, transform",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.serif,
                        fontSize: 120,
                        color: BRAND.fg,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      Try it now
                    </span>
                  </div>

                  {/* "at" connector */}
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.serif,
                        fontSize: 28,
                        color: BRAND.fgMuted,
                      }}
                    >
                      at
                    </span>
                  </div>

                  {/* URL — types in slowly, soothing */}
                  <div
                    style={{
                      marginTop: 16,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 36,
                        color: BRAND.blue,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {ctaCharsVisible > 0
                        ? ctaUrlText.slice(0, ctaCharsVisible)
                        : ""}
                      {!ctaTypingDone && ctaCharsVisible > 0 && (
                        <span
                          style={{
                            opacity: ctaCursorBlink ? 1 : 0.2,
                            color: BRAND.blue,
                          }}
                        >
                          |
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Compute honesty message */}
                  <div
                    style={{
                      marginTop: 48,
                      maxWidth: 700,
                      textAlign: "center",
                      opacity: computeOpacity,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 14,
                        color: BRAND.fgMuted,
                        lineHeight: 1.7,
                        letterSpacing: "0.02em",
                      }}
                    >
                      Running on 3 CPU nodes · No GPU · $500/mo on AKS
                    </span>
                    <br />
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 18,
                        color: `${BRAND.fg}99`,
                        lineHeight: 1.7,
                      }}
                    >
                      Imagine what happens when we scale.
                    </span>
                  </div>
                </div>

                {frame >= 683 && (
                  <PulseRing
                    color={BRAND.blue}
                    count={2}
                    size={300}
                    staggerFrames={10}
                    startFrame={688}
                    x={960}
                    y={420}
                  />
                )}
              </AbsoluteFill>
            );
          })()}

        <Vignette intensity={0.2} size={0.25} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
