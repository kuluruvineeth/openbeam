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

const CARDS = [
  {
    label: "Claude Desktop",
    icon: "C",
    iconBg: "#d4a574",
    subtitle: "Rich UI with ext-apps views",
  },
  {
    label: "Cursor IDE",
    icon: "\u2192",
    iconBg: LT.green,
    subtitle: "Inline code-aware search",
  },
  {
    label: "Terminal",
    icon: "$",
    iconBg: LT.blue,
    subtitle: "openbeam search --json",
  },
] as const;

const CARD_WIDTH = 380;
const CARD_GAP = 32;
const TOTAL_WIDTH = CARD_WIDTH * 3 + CARD_GAP * 2;

function SurfaceCard({
  card,
  index,
}: {
  card: (typeof CARDS)[number];
  index: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 15 - index * 8,
    fps,
    config: { mass: 1, damping: 24, stiffness: 200 },
    from: 0,
    to: 1,
  });

  const y = interpolate(entrance, [0, 1], [40, 0]);
  const opacity = interpolate(entrance, [0, 0.4, 1], [0, 0.8, 1]);

  return (
    <div
      style={{
        width: CARD_WIDTH,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${LT.borderSubtle}`,
        borderRadius: 12,
        padding: "48px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: card.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 700,
          fontFamily: LT.font.mono,
          color: "#000000",
        }}
      >
        {card.icon}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          fontFamily: LT.font.sans,
          color: LT.fg,
          letterSpacing: -0.3,
        }}
      >
        {card.label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontFamily: LT.font.sans,
          color: LT.fgDim,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {card.subtitle}
      </div>
    </div>
  );
}

export const SceneSurfaces: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({
    frame: frame - 5,
    fps,
    config: { mass: 1, damping: 22, stiffness: 180 },
    from: 0,
    to: 1,
  });

  const titleY = interpolate(titleEntrance, [0, 1], [20, 0]);
  const titleOpacity = interpolate(titleEntrance, [0, 0.3, 1], [0, 0.6, 1]);

  const fadeOut = interpolate(frame, [160, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBg opacity={0.12} variant="deep" />
      <FilmGrain opacity={0.03} />
      <Vignette intensity={0.5} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: LT.font.sans,
              color: LT.fg,
              letterSpacing: -1,
              textAlign: "center",
            }}
          >
            One server. <span style={{ color: LT.blue }}>Every surface.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: CARD_GAP,
            width: TOTAL_WIDTH,
          }}
        >
          {CARDS.map((card, i) => (
            <SurfaceCard card={card} index={i} key={card.label} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
