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
  Counter,
  GradientBg,
  GrainOverlay,
  PulseRing,
  ScanLine,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const ScrambleText: React.FC<{
  text: string;
  startFrame: number;
  settleFrame: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  settleFrame,
  fontSize,
  fontFamily,
  color,
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = "0123456789$.,KMB%";

  if (frame < startFrame) {
    return (
      <span style={{ fontSize, fontFamily, color, opacity: 0, ...style }}>
        {text}
      </span>
    );
  }

  if (frame >= settleFrame) {
    return (
      <span style={{ fontSize, fontFamily, color, ...style }}>{text}</span>
    );
  }

  const scrambled = text
    .split("")
    .map((ch) => {
      if (ch === " ") {
        return " ";
      }
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join("");

  return (
    <span style={{ fontSize, fontFamily, color, ...style }}>{scrambled}</span>
  );
};

const HighlightText: React.FC<{
  text: string;
  startFrame: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  highlightColor: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  fontSize,
  fontFamily,
  color,
  highlightColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.8 },
  });

  const underlineWidth = interpolate(progress, [0, 1], [0, 100]);
  const textOpacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{ fontSize, fontFamily, color, opacity: textOpacity, ...style }}
      >
        {text}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: -2,
          left: 0,
          width: `${underlineWidth}%`,
          height: 3,
          background: highlightColor,
          borderRadius: 1,
        }}
      />
    </span>
  );
};

const TerminalGrid: React.FC = () => {
  const lines: React.ReactNode[] = [];
  const spacing = 40;
  const count = Math.ceil(1080 / spacing);

  for (let i = 0; i < count; i += 1) {
    lines.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: i * spacing,
          height: 1,
          background: `${BRAND.fg}05`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {lines}
    </div>
  );
};

const DataFlash: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const visible = frame >= startFrame && frame <= startFrame + 1;

  if (!visible) {
    return null;
  }

  const y = 200 + Math.sin(startFrame * 7.3) * 300;

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 400,
        top: y,
        height: 1,
        background: `linear-gradient(to right, transparent, ${BRAND.green}40, transparent)`,
        pointerEvents: "none",
      }}
    />
  );
};

interface ArrRowProps {
  period: string;
  targetValue: string;
  widthPercent: number;
  bright?: boolean;
  startFrame: number;
}

const ArrRow: React.FC<ArrRowProps> = ({
  period,
  targetValue,
  widthPercent,
  bright = false,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 60, mass: 1.2 },
  });

  const barWidth = interpolate(progress, [0, 1], [0, widthPercent]);
  const labelOpacity = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const barGradientEnd = bright ? "33" : "0d";
  const barGradientStart = bright ? "26" : "1a";
  const borderLeft = bright
    ? `2px solid ${BRAND.green}99`
    : `2px solid ${BRAND.fg}4d`;

  const glowOpacity = bright
    ? interpolate(progress, [0.9, 1], [0, 0.6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 500,
          color: BRAND.fgMuted,
          letterSpacing: "0.08em",
          minWidth: 96,
          flexShrink: 0,
          textAlign: "right",
          opacity: labelOpacity,
        }}
      >
        {period}
      </span>
      <div
        style={{
          flex: 1,
          height: 36,
          background: BRAND.card,
          borderRadius: BRAND.radius,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: `linear-gradient(to right, ${BRAND.fg}${barGradientStart}, ${BRAND.fg}${barGradientEnd})`,
            borderLeft,
            borderRadius: BRAND.radius,
            position: "relative",
          }}
        >
          {bright && glowOpacity > 0 && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 60,
                background: `linear-gradient(to left, ${BRAND.green}${Math.round(
                  glowOpacity * 80
                )
                  .toString(16)
                  .padStart(2, "0")}, transparent)`,
                borderRadius: BRAND.radius,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Counter
              color={bright ? BRAND.fg : `${BRAND.fg}b3`}
              durationFrames={35}
              fontFamily={FONTS.mono}
              fontSize={12}
              startFrame={startFrame + 5}
              style={{ fontWeight: 600 }}
              value={targetValue}
            />
          </div>
        </div>
      </div>
      <div style={{ minWidth: 70, flexShrink: 0, textAlign: "right" }}>
        <ScrambleText
          color={bright ? BRAND.fg : `${BRAND.fg}cc`}
          fontFamily={FONTS.mono}
          fontSize={13}
          settleFrame={startFrame + 30}
          startFrame={startFrame}
          style={{ fontWeight: 600 }}
          text={targetValue}
        />
      </div>
    </div>
  );
};

const ARR_DATA: Omit<ArrRowProps, "startFrame">[] = [
  { period: "Month 8-10", targetValue: "$120K", widthPercent: 8 },
  { period: "Month 12", targetValue: "$600K", widthPercent: 20 },
  { period: "Month 18", targetValue: "$1.8M", widthPercent: 45 },
  { period: "Month 24", targetValue: "$3.6M", widthPercent: 70 },
  { period: "Month 36", targetValue: "$6M", widthPercent: 100, bright: true },
];

const BURN_ITEMS = [
  { label: "Salaries (4)", amount: "$52K", percentage: 84 },
  { label: "AI APIs", amount: "$2.5K", percentage: 4 },
  { label: "AKS + Cloud", amount: "$1.4K", percentage: 2 },
  { label: "SF + Ops", amount: "$6K", percentage: 10 },
];

export const SlideFinancials: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;

  const lastBarDone = 65 + 4 * 10 + 50;
  const pulseActive = frame >= lastBarDone;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity }}>
        <GradientBg colors={[BRAND.green]} opacity={0.05} />
        <TerminalGrid />
        <GrainOverlay opacity={0.04} />
        <ScanLine
          color={BRAND.green}
          durationFrames={55}
          glowSize={20}
          startFrame={10}
          thickness={1}
        />

        {ARR_DATA.map((_, i) => (
          <DataFlash key={i} startFrame={65 + i * 10 + 8} />
        ))}

        {pulseActive && (
          <PulseRing
            color={BRAND.green}
            count={2}
            size={300}
            staggerFrames={12}
            startFrame={lastBarDone}
            x={960}
            y={540}
          />
        )}

        <CameraMove
          durationFrames={220}
          intensity={0.3}
          startFrame={10}
          type="dolly"
        >
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 80,
              right: 80,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <BlurReveal maxBlur={12} startFrame={20}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 500,
                  color: `${BRAND.fg}e6`,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                FINANCIALS
              </span>
            </BlurReveal>
            <BlurReveal maxBlur={10} startFrame={20}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 400,
                  color: BRAND.fgMuted,
                }}
              >
                OpenBeam
              </span>
            </BlurReveal>
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              padding: "120px 80px 60px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "nowrap",
                alignItems: "baseline",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 64,
                  color: BRAND.fg,
                  lineHeight: 1.2,
                }}
              >
                Default alive at $930K ARR.
              </span>
            </div>

            <BlurReveal maxBlur={15} startFrame={45}>
              <p
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 42,
                  fontWeight: 400,
                  color: `${BRAND.fg}b3`,
                  lineHeight: 1.2,
                  margin: "10px 0 0",
                }}
              >
                $6M ARR by month 36.
              </p>
            </BlurReveal>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 32,
                maxWidth: 900,
              }}
            >
              {ARR_DATA.map((row, i) => (
                <ArrRow
                  bright={row.bright}
                  key={row.period}
                  period={row.period}
                  startFrame={65 + i * 10}
                  targetValue={row.targetValue}
                  widthPercent={row.widthPercent}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
              <BlurReveal maxBlur={18} startFrame={130} style={{ flex: 1 }}>
                <div
                  style={{
                    background: `${BRAND.fg}0f`,
                    borderTop: `1px solid ${BRAND.fg}1a`,
                    borderLeft: `1px solid ${BRAND.fg}1a`,
                    borderRadius: 0,
                    padding: "20px 24px",
                    height: "100%",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 12,
                      fontWeight: 500,
                      color: `${BRAND.fg}99`,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    MONTHLY BURN (4-PERSON TEAM)
                  </span>
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 28,
                      fontWeight: 600,
                      color: BRAND.fg,
                      marginTop: 12,
                      marginBottom: 14,
                    }}
                  >
                    <ScrambleText
                      color={BRAND.fg}
                      fontFamily={FONTS.mono}
                      fontSize={28}
                      settleFrame={160}
                      startFrame={135}
                      style={{ fontWeight: 600 }}
                      text="~$62K/mo"
                    />
                  </div>
                  {BURN_ITEMS.map((item, idx) => {
                    const barStart = 140 + idx * 5;
                    return (
                      <BurnBar
                        key={item.label}
                        label={`${item.label} ${item.amount}`}
                        percentage={item.percentage}
                        startFrame={barStart}
                      />
                    );
                  })}
                  <p
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 11,
                      color: `${BRAND.fg}b3`,
                      lineHeight: 1.5,
                      margin: "12px 0 0",
                    }}
                  >
                    Base case: 12 enterprise customers at $50K ACV = $600K ARR
                    by month 12. 64+ months runway on $4M.
                  </p>
                </div>
              </BlurReveal>

              <BlurReveal maxBlur={18} startFrame={135} style={{ flex: 1 }}>
                <UnitEconomicsBox />
              </BlurReveal>
            </div>
          </div>
        </CameraMove>

        <Vignette intensity={0.5} size={0.35} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const BurnBar: React.FC<{
  label: string;
  percentage: number;
  startFrame: number;
}> = ({ label, percentage, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1 },
  });
  const w = interpolate(progress, [0, 1], [0, percentage]);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: BRAND.fgMuted,
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        <span
          style={{ fontFamily: FONTS.mono, fontSize: 10, color: BRAND.fgMuted }}
        >
          {percentage}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: `${BRAND.fg}0a`,
          borderRadius: 2,
          marginTop: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: `${BRAND.fg}26`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

const UnitEconomicsBox: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cacProgress = spring({
    frame: frame - 150,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1 },
  });
  const ltvProgress = spring({
    frame: frame - 158,
    fps,
    config: { damping: 10, stiffness: 35, mass: 1.2 },
  });

  const cacWidth = interpolate(cacProgress, [0, 1], [0, 28]);
  const ltvWidth = interpolate(ltvProgress, [0, 1], [0, 100]);

  return (
    <div
      style={{
        background: `${BRAND.fg}0f`,
        borderTop: `1px solid ${BRAND.fg}1a`,
        borderLeft: `1px solid ${BRAND.fg}1a`,
        borderRadius: 0,
        padding: "20px 24px",
        height: "100%",
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 500,
          color: `${BRAND.fg}99`,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        PROJECTED UNIT ECONOMICS
      </span>
      <div style={{ marginTop: 16 }}>
        <ComparisonBar label="CAC" muted value="$1,200" width={cacWidth} />
        <ComparisonBar
          label="LTV"
          muted={false}
          value="$4,320"
          width={ltvWidth}
        />
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            color: BRAND.fgMuted,
            marginTop: 12,
          }}
        >
          <ScrambleText
            color={BRAND.fgMuted}
            fontFamily={FONTS.mono}
            fontSize={12}
            settleFrame={185}
            startFrame={165}
            text="3.6x LTV:CAC"
          />
        </div>
        <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
          <MetricPair label="month payback" startFrame={170} value="4" />
          <div>
            <HighlightText
              color={BRAND.fg}
              fontFamily={FONTS.mono}
              fontSize={36}
              highlightColor={BRAND.green}
              startFrame={175}
              style={{ fontWeight: 600, lineHeight: 1 }}
              text="$930K"
            />
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 14,
                color: BRAND.fgMuted,
                marginLeft: 8,
              }}
            >
              breakeven ARR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComparisonBar: React.FC<{
  label: string;
  value: string;
  width: number;
  muted: boolean;
}> = ({ label, value, width, muted }) => (
  <div style={{ marginBottom: 8 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <span
        style={{ fontFamily: FONTS.mono, fontSize: 10, color: BRAND.fgMuted }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: muted ? BRAND.fgMuted : BRAND.fg,
        }}
      >
        {value}
      </span>
    </div>
    <div
      style={{
        height: 10,
        background: `${BRAND.fg}0a`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: muted ? `${BRAND.fg}26` : `${BRAND.fg}33`,
          borderRadius: 2,
        }}
      />
    </div>
  </div>
);

const MetricPair: React.FC<{
  value: string;
  label: string;
  startFrame: number;
}> = ({ value, label, startFrame }) => (
  <div>
    <ScrambleText
      color={BRAND.fg}
      fontFamily={FONTS.mono}
      fontSize={36}
      settleFrame={startFrame + 20}
      startFrame={startFrame}
      style={{ fontWeight: 600, lineHeight: 1 }}
      text={value}
    />
    <span
      style={{
        fontFamily: FONTS.sans,
        fontSize: 14,
        color: BRAND.fgMuted,
        marginLeft: 8,
      }}
    >
      {label}
    </span>
  </div>
);
