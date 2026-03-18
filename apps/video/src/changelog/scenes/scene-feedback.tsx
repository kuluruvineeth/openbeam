import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Camera, type CameraKeyframe } from "../camera";
import { CLF } from "../fonts";
import {
  CheckCircleIcon,
  ClickCursor,
  MessageSquareIcon,
  MicIcon,
} from "../icons";
import { CL } from "../theme";

const CATEGORIES = [
  { value: "data-request", label: "Index data" },
  { value: "bug", label: "Broken" },
  { value: "enhancement", label: "Add feature" },
  { value: "ux-feedback", label: "Other" },
];

const INTERIM_TEXTS = [
  { frame: 140, text: "We need SOC 2" },
  { frame: 160, text: "We need SOC 2 and ISO 27001 controls" },
  {
    frame: 180,
    text: "We need SOC 2 and ISO 27001 controls searchable alongside",
  },
  {
    frame: 200,
    text: "We need SOC 2 and ISO 27001 controls searchable alongside CVEs. Our auditor keeps asking and I can't find them here.",
  },
];

const FULL_TRANSCRIPT =
  "We need SOC 2 and ISO 27001 controls searchable alongside CVEs. Our auditor keeps asking and I can't find them here.";

const FB_BTN_X = 1870;
const FB_BTN_Y = 1055;
const DIALOG_CX = 960;
const DIALOG_CY = 540;
const MIC_BTN_Y = 470;
const TOGGLE_X = 730;
const TOGGLE_Y = 600;
const SEND_X = 1200;
const SEND_Y = 650;

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { frame: 0, x: 960, y: 540, scale: 1 },
  { frame: 30, x: 960, y: 540, scale: 1 },
  { frame: 50, x: 1400, y: 850, scale: 1.6 },
  { frame: 70, x: 1400, y: 850, scale: 1.6 },
  { frame: 100, x: DIALOG_CX, y: DIALOG_CY, scale: 1.2 },
  { frame: 220, x: DIALOG_CX, y: DIALOG_CY, scale: 1.2 },
  { frame: 255, x: DIALOG_CX, y: 570, scale: 1.35 },
  { frame: 340, x: DIALOG_CX, y: 570, scale: 1.35 },
  { frame: 365, x: DIALOG_CX, y: DIALOG_CY, scale: 1.15 },
  { frame: 420, x: DIALOG_CX, y: DIALOG_CY, scale: 1.15 },
];

function WaveBars() {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 24 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const h =
          8 +
          Math.sin(frame * 0.35 + i * 1.4) * 7 +
          Math.cos(frame * 0.55 + i * 0.9) * 5;
        return (
          <div
            key={i}
            style={{
              width: 3,
              height: Math.max(4, h),
              borderRadius: 1.5,
              background: CL.primaryFg,
            }}
          />
        );
      })}
    </div>
  );
}

function DimmedSearchBg({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: CL.bg,
        opacity,
        display: "flex",
        flexDirection: "column",
        padding: "40px 320px",
      }}
    >
      <div
        style={{
          height: 48,
          border: `1px solid ${CL.borderSubtle}`,
          background: CL.bg,
          borderRadius: CL.radiusSm,
        }}
      />
      <div
        style={{
          marginTop: 16,
          height: 120,
          border: `1px solid ${CL.border}`,
          background: CL.card,
          borderRadius: CL.radius,
        }}
      />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          style={{
            marginTop: 8,
            height: 56,
            borderBottom: `1px solid ${CL.border}33`,
          }}
        />
      ))}
    </div>
  );
}

export const SceneFeedback: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dialogVisible = frame >= 65;
  const dialogScale = dialogVisible
    ? interpolate(frame, [65, 90], [0.95, 1], { extrapolateRight: "clamp" })
    : 0;
  const dialogOpacity = dialogVisible
    ? interpolate(frame, [65, 85], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const backdropOpacity = dialogVisible
    ? interpolate(frame, [65, 85], [0, 0.5], { extrapolateRight: "clamp" })
    : 0;

  const showRecord = frame >= 85 && frame < 120;
  const showListening = frame >= 120 && frame < 225;
  const showReview = frame >= 235 && frame < 350;
  const showDone = frame >= 360;

  const interimText = INTERIM_TEXTS.reduce(
    (acc, t) => (frame >= t.frame ? t.text : acc),
    ""
  );

  const reviewTranscriptChars = showReview
    ? Math.min(FULL_TRANSCRIPT.length, Math.floor((frame - 235) * 3))
    : 0;

  const selectedCategory = frame >= 285 ? "data-request" : "";

  const doneProgress = showDone
    ? spring({
        frame: frame - 360,
        fps,
        config: { damping: 20, stiffness: 200, mass: 0.8 },
      })
    : 0;

  const cursorPhase1 = frame >= 40 && frame < 68;
  const cursorPhase2 = frame >= 100 && frame < 125;
  const cursorPhase3 = frame >= 270 && frame < 295;
  const cursorPhase4 = frame >= 330 && frame < 355;

  let cX = -100;
  let cY = -100;

  if (cursorPhase1) {
    cX = interpolate(frame, [40, 55], [FB_BTN_X + 80, FB_BTN_X], {
      extrapolateRight: "clamp",
    });
    cY = interpolate(frame, [40, 55], [FB_BTN_Y + 50, FB_BTN_Y], {
      extrapolateRight: "clamp",
    });
  } else if (cursorPhase2) {
    cX = interpolate(frame, [100, 115], [DIALOG_CX + 100, DIALOG_CX], {
      extrapolateRight: "clamp",
    });
    cY = interpolate(frame, [100, 115], [MIC_BTN_Y + 80, MIC_BTN_Y], {
      extrapolateRight: "clamp",
    });
  } else if (cursorPhase3) {
    cX = interpolate(frame, [270, 282], [TOGGLE_X + 80, TOGGLE_X], {
      extrapolateRight: "clamp",
    });
    cY = interpolate(frame, [270, 282], [TOGGLE_Y + 50, TOGGLE_Y], {
      extrapolateRight: "clamp",
    });
  } else if (cursorPhase4) {
    cX = interpolate(frame, [330, 342], [SEND_X + 80, SEND_X], {
      extrapolateRight: "clamp",
    });
    cY = interpolate(frame, [330, 342], [SEND_Y + 50, SEND_Y], {
      extrapolateRight: "clamp",
    });
  }

  const cursorClicking =
    (frame >= 56 && frame < 61) ||
    (frame >= 116 && frame < 121) ||
    (frame >= 283 && frame < 288) ||
    (frame >= 343 && frame < 348);
  const cursorShown =
    cursorPhase1 || cursorPhase2 || cursorPhase3 || cursorPhase4;

  return (
    <AbsoluteFill style={{ background: CL.bg }}>
      <Camera height={1080} keyframes={CAMERA_KEYFRAMES} width={1920}>
        <AbsoluteFill>
          <DimmedSearchBg opacity={0.15} />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: CL.bg,
              opacity: backdropOpacity,
            }}
          />

          {frame < 65 && (
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${CL.borderSubtle}`,
                background: CL.bg,
                padding: "6px 12px",
                borderRadius: CL.radiusSm,
                fontFamily: CLF.sans,
                fontSize: 12,
                color: `${CL.fgMuted}99`,
                opacity: interpolate(frame, [0, 15], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <MessageSquareIcon color={`${CL.fgMuted}99`} size={13} />
              <span>Feedback</span>
            </div>
          )}

          {dialogVisible && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 480,
                  background: CL.card,
                  border: `1px solid ${CL.border}`,
                  borderRadius: 10,
                  padding: 20,
                  opacity: dialogOpacity,
                  transform: `scale(${dialogScale * 1.3})`,
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: CLF.sans,
                      fontSize: 18,
                      fontWeight: 600,
                      color: CL.fg,
                    }}
                  >
                    What should we fix or add?
                  </span>
                </div>

                {showRecord && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        border: `1px solid ${CL.borderSubtle}`,
                        background: `${CL.muted}80`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MicIcon color={CL.fgMuted} size={24} />
                    </div>
                    <p
                      style={{
                        fontFamily: CLF.sans,
                        fontSize: 12,
                        color: CL.fgMuted,
                      }}
                    >
                      Tap to speak your mind
                    </p>
                    <div
                      style={{
                        width: "100%",
                        height: 80,
                        borderRadius: CL.radius,
                        border: `1px solid ${CL.border}`,
                        background: CL.bg,
                        padding: 12,
                        fontFamily: CLF.sans,
                        fontSize: 14,
                        color: CL.fgGhost,
                      }}
                    >
                      What should we fix or add?
                    </div>
                  </div>
                )}

                {showListening && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 0",
                      opacity: interpolate(frame, [120, 132], [0, 1], {
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        background: CL.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      <WaveBars />
                      <div
                        style={{
                          position: "absolute",
                          inset: -6,
                          borderRadius: 46,
                          border: `2px solid ${CL.primary}26`,
                          opacity: frame % 30 < 20 ? 1 : 0,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: CLF.sans,
                        fontSize: 12,
                        color: CL.fgMuted,
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
                      <span
                        style={{
                          fontFamily: CLF.mono,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        0:
                        {String(
                          Math.min(Math.floor((frame - 120) / 30), 59)
                        ).padStart(2, "0")}
                      </span>
                    </div>

                    {interimText && (
                      <p
                        style={{
                          maxWidth: "100%",
                          textAlign: "center",
                          fontFamily: CLF.sans,
                          fontSize: 14,
                          color: `${CL.fg}99`,
                          lineHeight: 1.5,
                          padding: "0 8px",
                        }}
                      >
                        {interimText}
                      </p>
                    )}
                  </div>
                )}

                {showReview && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: "8px 0",
                      opacity: interpolate(frame, [235, 248], [0, 1], {
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        minHeight: 80,
                        borderRadius: CL.radius,
                        border: `1px solid ${CL.border}`,
                        background: CL.bg,
                        padding: 12,
                        fontFamily: CLF.sans,
                        fontSize: 14,
                        color: CL.fg,
                        lineHeight: 1.5,
                      }}
                    >
                      {FULL_TRANSCRIPT.slice(0, reviewTranscriptChars)}
                    </div>

                    <div>
                      <p
                        style={{
                          fontFamily: CLF.sans,
                          fontSize: 12,
                          color: CL.fgMuted,
                          marginBottom: 6,
                        }}
                      >
                        What kind of feedback?
                      </p>
                      <div style={{ display: "flex", gap: 4 }}>
                        {CATEGORIES.map((cat) => {
                          const isSelected = cat.value === selectedCategory;
                          return (
                            <div
                              key={cat.value}
                              style={{
                                height: 28,
                                padding: "0 10px",
                                borderRadius: CL.radiusSm,
                                border: `1px solid ${isSelected ? CL.fg : CL.border}`,
                                background: isSelected ? CL.fg : "transparent",
                                color: isSelected ? CL.bg : CL.fgMuted,
                                fontFamily: CLF.sans,
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {cat.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        paddingTop: 4,
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 12px",
                          fontFamily: CLF.sans,
                          fontSize: 13,
                          color: CL.fgMuted,
                        }}
                      >
                        Discard
                      </div>
                      <div
                        style={{
                          padding: "6px 16px",
                          borderRadius: CL.radiusSm,
                          background: CL.primary,
                          color: CL.primaryFg,
                          fontFamily: CLF.sans,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Send
                      </div>
                    </div>
                  </div>
                )}

                {showDone && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "32px 0",
                      opacity: interpolate(doneProgress, [0, 1], [0, 1]),
                      transform: `scale(${interpolate(doneProgress, [0, 1], [0.95, 1])})`,
                    }}
                  >
                    <CheckCircleIcon color={CL.green400} size={36} />
                    <p
                      style={{
                        fontFamily: CLF.sans,
                        fontSize: 14,
                        color: CL.fg,
                      }}
                    >
                      Got it. We'll look into it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <ClickCursor
            clicking={cursorClicking}
            visible={cursorShown}
            x={cX}
            y={cY}
          />
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};
