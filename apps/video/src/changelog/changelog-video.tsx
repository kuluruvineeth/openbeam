import type React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLF } from "./fonts";
import { SceneFeedback } from "./scenes/scene-feedback";
import { SceneGitHub } from "./scenes/scene-github";
import { SceneLanding } from "./scenes/scene-landing";
import { SceneResults } from "./scenes/scene-results";
import { CL } from "./theme";

const SCENE_DURATIONS = {
  intro: 105,
  landing: 240,
  results: 360,
  feedback: 420,
  github: 420,
  outro: 210,
} as const;

export const TOTAL_FRAMES =
  SCENE_DURATIONS.intro +
  SCENE_DURATIONS.landing +
  SCENE_DURATIONS.results +
  SCENE_DURATIONS.feedback +
  SCENE_DURATIONS.github +
  SCENE_DURATIONS.outro;

const SCENE_STARTS = {
  intro: 0,
  landing: SCENE_DURATIONS.intro,
  results: SCENE_DURATIONS.intro + SCENE_DURATIONS.landing,
  feedback:
    SCENE_DURATIONS.intro + SCENE_DURATIONS.landing + SCENE_DURATIONS.results,
  github:
    SCENE_DURATIONS.intro +
    SCENE_DURATIONS.landing +
    SCENE_DURATIONS.results +
    SCENE_DURATIONS.feedback,
  outro:
    SCENE_DURATIONS.intro +
    SCENE_DURATIONS.landing +
    SCENE_DURATIONS.results +
    SCENE_DURATIONS.feedback +
    SCENE_DURATIONS.github,
} as const;

type ChangelogVideoProps = {
  version: string;
  tagline: string;
  date: string;
  music: string;
};

function IntroCard({
  version,
  tagline,
  date,
}: {
  version: string;
  tagline: string;
  date: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const versionProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
  });
  const versionScale = interpolate(versionProgress, [0, 1], [0.8, 1]);
  const versionOpacity = interpolate(versionProgress, [0, 1], [0, 1]);

  const taglineOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [20, 35], [10, 0], {
    extrapolateRight: "clamp",
  });

  const dateOpacity = interpolate(frame, [35, 48], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [80, 105], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: CL.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "8px 28px",
          borderRadius: CL.radiusSm,
          border: `1px solid ${CL.border}`,
          fontFamily: CLF.mono,
          fontSize: 18,
          fontWeight: 700,
          color: CL.fgMuted,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          opacity: versionOpacity,
          transform: `scale(${versionScale})`,
        }}
      >
        {version}
      </div>

      <h1
        style={{
          marginTop: 40,
          fontFamily: CLF.sans,
          fontSize: 80,
          fontWeight: 700,
          color: CL.fg,
          textAlign: "center",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          maxWidth: 1200,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        {tagline}
      </h1>

      <p
        style={{
          marginTop: 24,
          fontFamily: CLF.sans,
          fontSize: 20,
          color: CL.fgDim,
          letterSpacing: "0.02em",
          opacity: dateOpacity,
        }}
      >
        {date}
      </p>
    </AbsoluteFill>
  );
}

function OutroCard({ version }: { version: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [175, 210], [1, 0], {
    extrapolateRight: "clamp",
  });

  const tryItScale = interpolate(
    spring({
      frame: frame - 55,
      fps,
      config: { damping: 14, stiffness: 40, mass: 1.5 },
    }),
    [0, 1],
    [0.7, 1]
  );
  const tryItOpacity = interpolate(
    spring({
      frame: frame - 55,
      fps,
      config: { damping: 20, stiffness: 80, mass: 1 },
    }),
    [0, 0.3],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  const tryItBlur = interpolate(
    spring({
      frame: frame - 55,
      fps,
      config: { damping: 20, stiffness: 80, mass: 1 },
    }),
    [0, 1],
    [30, 0]
  );

  const headerFadeDown = interpolate(frame, [55, 70], [1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlText = "app.openbeam.work/explore";
  const urlStart = 75;
  const urlChars = Math.min(
    urlText.length,
    Math.max(0, Math.floor((frame - urlStart) * 0.35))
  );
  const urlDone = urlChars >= urlText.length;
  const cursorBlink = Math.floor(frame / 12) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        background: CL.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: headerFadeDown,
        }}
      >
        {frame >= 5 && (
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 48,
              height: 48,
              opacity: interpolate(frame, [5, 20], [0, 1], {
                extrapolateRight: "clamp",
              }),
              filter: `blur(${interpolate(frame, [5, 20], [10, 0], { extrapolateRight: "clamp" })}px)`,
            }}
          />
        )}

        {frame >= 15 && (
          <h3
            style={{
              marginTop: 16,
              fontFamily: CL.font.serif,
              fontSize: 64,
              color: CL.fg,
              letterSpacing: "-0.02em",
              opacity: interpolate(frame, [15, 30], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            OpenBeam
          </h3>
        )}
      </div>

      {frame >= 55 && (
        <h2
          style={{
            marginTop: 40,
            fontFamily: CL.font.serif,
            fontSize: 120,
            color: CL.fg,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            transform: `scale(${tryItScale})`,
            opacity: tryItOpacity,
            filter: `blur(${tryItBlur}px)`,
            willChange: "filter, opacity, transform",
          }}
        >
          Try it now
        </h2>
      )}

      {frame >= 68 && (
        <p
          style={{
            marginTop: 20,
            fontFamily: CL.font.serif,
            fontSize: 28,
            color: CL.fgDim,
            opacity: interpolate(frame, [68, 75], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          at
        </p>
      )}

      {frame >= 73 && (
        <div
          style={{
            marginTop: 16,
            height: 48,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: CLF.mono,
              fontSize: 32,
              color: CL.blue400,
              letterSpacing: "0.02em",
            }}
          >
            {urlText.slice(0, urlChars)}
            {!urlDone && urlChars > 0 && (
              <span
                style={{ opacity: cursorBlink ? 1 : 0.2, color: CL.blue400 }}
              >
                |
              </span>
            )}
          </span>
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 20px",
          borderRadius: CL.radiusSm,
          border: `1px solid ${CL.border}`,
          fontFamily: CLF.mono,
          fontSize: 14,
          fontWeight: 600,
          color: CL.fgDim,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          opacity: interpolate(frame, [140, 155], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {version}
      </div>
    </AbsoluteFill>
  );
}

function ChangelogAudio({ music }: { music: string }) {
  const frame = useCurrentFrame();

  const musicVolume = interpolate(
    frame,
    [0, 30, TOTAL_FRAMES - 90, TOTAL_FRAMES - 30, TOTAL_FRAMES],
    [0, 0.35, 0.35, 0.45, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      <Audio loop src={staticFile(music)} volume={musicVolume} />

      <Sequence durationInFrames={30} from={0}>
        <Audio src={staticFile("sfx/whip.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.landing - 3}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.landing + 93}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      {Array.from({ length: 18 }, (_, i) => {
        const absFrame = SCENE_STARTS.landing + 145 + i * 4;
        return (
          <Sequence durationInFrames={3} from={absFrame} key={`ltype-${i}`}>
            <Audio
              src={staticFile("sfx-keypress.mp3")}
              volume={0.06 + (i % 3) * 0.02}
            />
          </Sequence>
        );
      })}

      <Sequence durationInFrames={30} from={SCENE_STARTS.results - 3}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.feedback - 3}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.feedback + 56}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.feedback + 116}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.feedback + 283}>
        <Audio src={staticFile("sfx/switch.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.feedback + 343}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.feedback + 362}>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.15} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.github - 3}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.github + 190}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.outro - 3}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.outro + 15}>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.12} />
      </Sequence>

      {Array.from({ length: 18 }, (_, i) => {
        const absFrame = SCENE_STARTS.outro + 75 + i * 4;
        return (
          <Sequence
            durationInFrames={3}
            from={absFrame}
            key={`outro-type-${i}`}
          >
            <Audio
              src={staticFile("sfx-keypress.mp3")}
              volume={0.05 + (i % 3) * 0.01}
            />
          </Sequence>
        );
      })}
    </>
  );
}

export const ChangelogVideo: React.FC<ChangelogVideoProps> = ({
  version,
  tagline,
  date,
  music,
}) => (
  <AbsoluteFill style={{ background: CL.bg }}>
    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.intro}>
        <IntroCard date={date} tagline={tagline} version={version} />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.landing}>
        <SceneLanding />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.results}>
        <SceneResults />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.feedback}>
        <SceneFeedback />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.github}>
        <SceneGitHub />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.outro}>
        <OutroCard version={version} />
      </Series.Sequence>
    </Series>

    <AbsoluteFill>
      <ChangelogAudio music={music} />
    </AbsoluteFill>
  </AbsoluteFill>
);
