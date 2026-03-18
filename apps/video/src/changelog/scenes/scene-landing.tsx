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
import {
  ArrowRightIcon,
  AudioWaveIcon,
  ClickCursor,
  MicIcon,
  SearchIcon,
} from "../icons";
import { CL } from "../theme";

const EXPLORE_CARDS = [
  {
    id: "CVE-2021-44228",
    title: "Apache Log4j2 JNDI Remote Code Execution",
    meta: "CVSS 10.0 · Dec 2021 · Actively exploited",
  },
  {
    id: "T1190",
    title: "Exploit Public-Facing Application",
    meta: "Initial Access · Enterprise · 23 groups",
  },
  {
    id: "Cheat Sheet",
    title: "SQL Injection Prevention",
    meta: "Input validation · Parameterized queries",
  },
  {
    id: "CISA KEV",
    title: "Known Exploited Vulnerabilities Catalog",
    meta: "1,500+ entries · Ransomware-linked",
  },
] as const;

const TYPED_TEXT = "log4shell critical vulnerabilities";

const SEARCH_BAR_Y = 500;
const MIC_X = 1275;
const MIC_Y = SEARCH_BAR_Y;

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { frame: 0, x: 960, y: 540, scale: 1 },
  { frame: 80, x: 960, y: 540, scale: 1 },
  { frame: 105, x: 960, y: SEARCH_BAR_Y, scale: 1.8 },
  { frame: 240, x: 960, y: SEARCH_BAR_Y, scale: 1.8 },
];

function DotGrid() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.03,
        backgroundImage: `radial-gradient(circle, ${CL.fg} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    />
  );
}

export const SceneLanding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = interpolate(frame, [0, 20], [0.8, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [8, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 25], [16, 0], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [18, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [18, 35], [10, 0], {
    extrapolateRight: "clamp",
  });

  const searchOpacity = interpolate(frame, [28, 42], [0, 1], {
    extrapolateRight: "clamp",
  });
  const searchY = interpolate(frame, [28, 42], [10, 0], {
    extrapolateRight: "clamp",
  });

  const footerOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateRight: "clamp",
  });

  const isPreListening = frame >= 88 && frame < 95;
  const isListening = frame >= 95 && frame < 140;
  const isTyping = frame >= 145;
  const showMicActive = isPreListening || isListening;

  const listeningIndicatorOpacity = isListening
    ? interpolate(frame, [95, 103], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const listeningFadeOut =
    frame >= 135
      ? interpolate(frame, [135, 142], [1, 0], { extrapolateRight: "clamp" })
      : 1;

  const charsTyped = isTyping
    ? Math.min(TYPED_TEXT.length, Math.floor((frame - 145) * 0.5))
    : 0;
  const typedText = TYPED_TEXT.slice(0, charsTyped);
  const cursorVisible = isTyping && frame % 16 < 10;

  const cursorX = interpolate(
    frame,
    [82, 92, 140, 146],
    [MIC_X + 80, MIC_X, MIC_X, MIC_X - 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorY = interpolate(
    frame,
    [82, 92, 140, 146],
    [MIC_Y + 60, MIC_Y, MIC_Y, MIC_Y],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorClicking = frame >= 92 && frame < 96;
  const cursorShown = frame >= 82 && frame < 146;

  return (
    <AbsoluteFill style={{ background: CL.bg }}>
      <Camera height={1080} keyframes={CAMERA_KEYFRAMES} width={1920}>
        <AbsoluteFill>
          <DotGrid />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 620px",
            }}
          >
            <div
              style={{
                opacity: logoOpacity,
                transform: `scale(${logoScale})`,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Img
                src={staticFile("logo.png")}
                style={{ width: 40, height: 40 }}
              />
            </div>

            <h1
              style={{
                marginTop: 32,
                fontFamily: CL.font.serif,
                fontSize: 64,
                fontWeight: 400,
                color: CL.fg,
                textAlign: "center",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                opacity: titleOpacity,
                transform: `translateY(${titleY}px)`,
              }}
            >
              OpenBeam
            </h1>

            <p
              style={{
                marginTop: 20,
                fontFamily: CLF.sans,
                fontSize: 14,
                color: CL.fgMuted,
                textAlign: "center",
                letterSpacing: "0.04em",
                opacity: subtitleOpacity,
                transform: `translateY(${subtitleY}px)`,
              }}
            >
              Search vulnerabilities, techniques, and security guides
            </p>

            <div
              style={{
                marginTop: 40,
                width: "100%",
                maxWidth: 680,
                opacity: searchOpacity,
                transform: `translateY(${searchY}px)`,
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
                <div
                  style={{
                    flex: 1,
                    fontFamily: CLF.sans,
                    fontSize: 15,
                    color: isTyping ? CL.fg : `${CL.fg}66`,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isTyping ? (
                    <span>
                      {typedText}
                      {cursorVisible && (
                        <span style={{ color: CL.fgMuted }}>|</span>
                      )}
                    </span>
                  ) : (
                    "log4shell, SQL injection, T1190..."
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {showMicActive ? (
                    <AudioWaveIcon color={CL.primary} size={18} />
                  ) : (
                    <MicIcon color={`${CL.fg}66`} size={18} />
                  )}
                </div>
              </div>

              {isListening && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontFamily: CLF.sans,
                    fontSize: 12,
                    color: CL.fgMuted,
                    opacity: listeningIndicatorOpacity * listeningFadeOut,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: CL.destructive,
                      opacity: frame % 20 < 12 ? 1 : 0.3,
                    }}
                  />
                  <span>Listening...</span>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                width: "100%",
                maxWidth: 680,
              }}
            >
              {EXPLORE_CARDS.map((card, index) => {
                const cardStart = 38 + index * 6;
                const cardProgress = spring({
                  frame: frame - cardStart,
                  fps,
                  config: SPRING_CARD,
                });
                const cardOpacity = interpolate(
                  cardProgress,
                  [0, 0.5],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                );
                const cardY = interpolate(cardProgress, [0, 1], [8, 0]);

                return (
                  <div
                    key={card.id}
                    style={{
                      border: `1px solid ${CL.borderSubtle}`,
                      background: CL.card,
                      padding: 20,
                      position: "relative",
                      opacity: cardOpacity,
                      transform: `translateY(${cardY}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: CLF.mono,
                        fontSize: 10,
                        color: CL.fgMuted,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {card.id}
                    </span>
                    <p
                      style={{
                        marginTop: 6,
                        fontFamily: CLF.sans,
                        fontSize: 14,
                        color: CL.fg,
                        lineHeight: 1.4,
                      }}
                    >
                      {card.title}
                    </p>
                    <p
                      style={{
                        marginTop: 8,
                        fontFamily: CLF.mono,
                        fontSize: 10,
                        color: `${CL.fgMuted}80`,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {card.meta}
                    </p>
                    <ArrowRightIcon
                      color={`${CL.fgMuted}80`}
                      size={12}
                      style={{ position: "absolute", right: 16, bottom: 16 }}
                    />
                  </div>
                );
              })}
            </div>

            <p
              style={{
                marginTop: 48,
                fontFamily: CLF.mono,
                fontSize: 10,
                color: `${CL.fgMuted}4D`,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                opacity: footerOpacity,
              }}
            >
              NVD · MITRE ATT&CK · OWASP · CISA KEV
            </p>
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
