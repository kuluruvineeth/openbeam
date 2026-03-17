import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BlurReveal,
  CameraMove,
  Glitch,
  GradientBg,
  GrainOverlay,
  HighlightText,
  ParticleField,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

interface Competitor {
  name: string;
  has: string;
  missing: string;
}

const COMPETITORS: Competitor[] = [
  {
    name: "Glean",
    has: "Digital search",
    missing: "Cloud-only. Can't deploy at the edge. Will never go air-gapped.",
  },
  {
    name: "Onyx",
    has: "Digital search, open source",
    missing:
      "No physical connectors, no edge runtime, no industrial protocols.",
  },
  {
    name: "Samsara",
    has: "Physical telemetry",
    missing:
      "Hardware-bound. No digital knowledge search. No cross-source correlation.",
  },
  {
    name: "PTC / ThingWorx",
    has: "Physical ops, on-prem",
    missing: "Divesting for $725M. Legacy architecture, no AI, no search.",
  },
];

const OPENBEAM_CAPABILITIES = [
  "Digital search",
  "Physical ops",
  "Edge/air-gap",
  "Open source",
  "AI agents",
];

const GLITCH_FRAME = 128;
const OPENBEAM_ENTER = 136;

const CompetitorRow: React.FC<{
  competitor: Competitor;
  startFrame: number;
}> = ({ competitor, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 90, mass: 0.9 },
  });

  const x = interpolate(progress, [0, 1], [80, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `translateX(${x}px)`,
        opacity,
        display: "flex",
        alignItems: "baseline",
        gap: 0,
        borderBottom: `1px solid ${BRAND.border}80`,
        padding: "16px 0",
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 14,
          fontWeight: 400,
          color: BRAND.fg,
          width: 200,
          flexShrink: 0,
        }}
      >
        {competitor.name}
      </span>

      <div style={{ flex: 1, display: "flex", gap: 32 }}>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              fontWeight: 500,
              color: `${BRAND.fg}80`,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 4,
            }}
          >
            HAS
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              fontWeight: 400,
              color: BRAND.fgMuted,
            }}
          >
            {competitor.has}
          </span>
        </div>

        <div style={{ flex: 1.5 }}>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              fontWeight: 500,
              color: `${BRAND.fg}80`,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 4,
            }}
          >
            MISSING
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              fontWeight: 400,
              color: `${BRAND.pink}66`,
            }}
          >
            {competitor.missing}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SlideCompetition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const subtextProgress = spring({
    frame: frame - 65,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const subtextOpacity = interpolate(subtextProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const openbeamSpring = spring({
    frame: frame - OPENBEAM_ENTER,
    fps,
    config: { damping: 14, stiffness: 200, mass: 1.2 },
  });

  const openbeamY = interpolate(openbeamSpring, [0, 1], [60, 0]);
  const openbeamOpacity = interpolate(openbeamSpring, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const shakeActive = frame >= OPENBEAM_ENTER && frame < OPENBEAM_ENTER + 8;
  const shakeX = shakeActive
    ? Math.sin((frame - OPENBEAM_ENTER) * 5.3) *
      3 *
      (1 - (frame - OPENBEAM_ENTER) / 8)
    : 0;
  const shakeY = shakeActive
    ? Math.sin((frame - OPENBEAM_ENTER) * 7.1 + 1) *
      2 *
      (1 - (frame - OPENBEAM_ENTER) / 8)
    : 0;

  const borderDrawProgress = interpolate(
    frame,
    [OPENBEAM_ENTER, OPENBEAM_ENTER + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const allCompetitorsIn = frame >= 116 + 12;
  const filmBarsClose = allCompetitorsIn && frame < OPENBEAM_ENTER;
  const filmBarsOpen = frame >= OPENBEAM_ENTER;

  let filmBarAmount = 0;
  if (filmBarsClose) {
    filmBarAmount = interpolate(frame, [128, GLITCH_FRAME + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (filmBarsOpen) {
    filmBarAmount = interpolate(
      frame,
      [OPENBEAM_ENTER, OPENBEAM_ENTER + 10],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );
  }

  const capHighlightStart = OPENBEAM_ENTER + 15;

  return (
    <SlideLayout label="Competition">
      <GradientBg colors={[BRAND.pink, BRAND.orange]} opacity={0.06} />
      <ParticleField count={60} opacity={0.08} />
      <GrainOverlay opacity={0.03} />

      <CameraMove
        durationFrames={140}
        intensity={0.3}
        startFrame={80}
        type="pan"
      >
        <Glitch
          durationFrames={6}
          intensity={1.2}
          slices={8}
          startFrame={GLITCH_FRAME}
        >
          <AbsoluteFill>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 80px",
                transform: `translate(${shakeX}px, ${shakeY}px)`,
              }}
            >
              <BlurReveal startFrame={20}>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    fontWeight: 500,
                    color: BRAND.fgMuted,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  COMPETITION
                </span>
              </BlurReveal>

              <div style={{ marginTop: 16, marginBottom: 4 }}>
                <TextReveal
                  color={BRAND.fg}
                  fontFamily={FONTS.serif}
                  fontSize={64}
                  mode="words"
                  staggerFrames={3}
                  startFrame={25}
                  style={{ lineHeight: 1.12 }}
                  text="Glean can't go physical."
                />
              </div>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={64}
                mode="words"
                staggerFrames={3}
                startFrame={40}
                style={{ lineHeight: 1.12 }}
                text="Samsara can't do search."
              />
              <div style={{ marginTop: 6 }}>
                <TextReveal
                  color={BRAND.fg}
                  fontFamily={FONTS.serif}
                  fontSize={68}
                  mode="words"
                  staggerFrames={4}
                  startFrame={52}
                  style={{ lineHeight: 1.12, fontWeight: 400 }}
                  text="We do both."
                />
              </div>

              <div
                style={{
                  opacity: subtextOpacity,
                  marginTop: 10,
                  marginBottom: 28,
                }}
              >
                <p
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 18,
                    fontWeight: 400,
                    color: BRAND.fgMuted,
                    margin: 0,
                  }}
                >
                  Five capabilities define the full platform. No competitor has
                  more than two.
                </p>
              </div>

              <div>
                <CompetitorRow competitor={COMPETITORS[0]} startFrame={80} />
                <CompetitorRow competitor={COMPETITORS[1]} startFrame={92} />
                <CompetitorRow competitor={COMPETITORS[2]} startFrame={104} />
                <CompetitorRow competitor={COMPETITORS[3]} startFrame={116} />

                <div
                  style={{
                    marginTop: 20,
                    position: "relative",
                    backgroundColor: `${BRAND.fg}07`,
                    padding: "20px 24px",
                    borderRadius: BRAND.radius,
                    transform: `translateY(${openbeamY}px)`,
                    opacity: openbeamOpacity,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `${BRAND.fg}66`,
                      transformOrigin: "left",
                      transform: `scaleX(${borderDrawProgress})`,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />

                  {openbeamOpacity > 0.5 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: -1,
                        borderRadius: BRAND.radius,
                        boxShadow: `0 0 20px 4px ${BRAND.fg}10, 0 0 40px 8px ${BRAND.fg}08`,
                        pointerEvents: "none",
                        opacity: interpolate(
                          frame,
                          [OPENBEAM_ENTER + 5, OPENBEAM_ENTER + 25],
                          [0.8, 0.3],
                          {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          }
                        ),
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 14,
                        fontWeight: 600,
                        color: BRAND.fg,
                        width: 176,
                        flexShrink: 0,
                      }}
                    >
                      OpenBeam
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      {OPENBEAM_CAPABILITIES.map((cap, i) => (
                        <HighlightText
                          color={BRAND.fg}
                          fontFamily={FONTS.sans}
                          fontSize={14}
                          highlightColor={BRAND.green}
                          highlightStyle="underline"
                          key={cap}
                          startFrame={capHighlightStart + i * 8}
                          text={cap}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AbsoluteFill>
        </Glitch>
      </CameraMove>

      {filmBarAmount > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: filmBarAmount * 80,
              backgroundColor: BRAND.bg,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: filmBarAmount * 80,
              backgroundColor: BRAND.bg,
            }}
          />
        </div>
      )}

      <Vignette intensity={0.3} size={0.35} />
    </SlideLayout>
  );
};
