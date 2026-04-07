import type React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SceneCta } from "./scenes/scene-cta";
import { SceneDock } from "./scenes/scene-dock";
import { SceneHook } from "./scenes/scene-hook";
import { SceneLogoWall } from "./scenes/scene-logo-wall";
import { SceneStats } from "./scenes/scene-stats";
import { LT } from "./theme";

const SCENE = {
  hook: 300,
  logoWall: 210,
  dock: 120,
  stats: 150,
  cta: 180,
} as const;

export const LAUNCH_TOTAL_FRAMES =
  SCENE.hook + SCENE.logoWall + SCENE.dock + SCENE.stats + SCENE.cta;

const SCENE_STARTS = {
  hook: 0,
  logoWall: SCENE.hook,
  dock: SCENE.hook + SCENE.logoWall,
  stats: SCENE.hook + SCENE.logoWall + SCENE.dock,
  cta: SCENE.hook + SCENE.logoWall + SCENE.dock + SCENE.stats,
} as const;

function LaunchAudio() {
  const frame = useCurrentFrame();

  const musicVolume = interpolate(
    frame,
    [
      0,
      45,
      SCENE_STARTS.dock - 5,
      SCENE_STARTS.dock + 10,
      SCENE_STARTS.stats,
      LAUNCH_TOTAL_FRAMES - 120,
      LAUNCH_TOTAL_FRAMES - 60,
      LAUNCH_TOTAL_FRAMES,
    ],
    [0, 0.3, 0.3, 0.08, 0.35, 0.35, 0.42, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const transitionFrames = [
    SCENE_STARTS.logoWall,
    SCENE_STARTS.dock,
    SCENE_STARTS.stats,
    SCENE_STARTS.cta,
  ];

  return (
    <>
      <Audio
        loop
        src={staticFile("music/launch-bg-1.mp3")}
        volume={musicVolume}
      />

      <Sequence durationInFrames={30} from={0}>
        <Audio src={staticFile("sfx/whip.wav")} volume={0.14} />
      </Sequence>

      {Array.from({ length: 8 }, (_, i) => (
        <Sequence
          durationInFrames={20}
          from={SCENE_STARTS.hook + 15 + i * 15}
          key={`orbit-ping-${i}`}
        >
          <Audio
            src={staticFile("sfx/switch.wav")}
            volume={0.06 + (i % 3) * 0.02}
          />
        </Sequence>
      ))}

      <Sequence durationInFrames={30} from={SCENE_STARTS.logoWall + 60}>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={10} from={SCENE_STARTS.dock + 40}>
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.12} />
      </Sequence>

      {transitionFrames.map((f) => (
        <Sequence durationInFrames={30} from={f - 3} key={`whoosh-${f}`}>
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.1} />
        </Sequence>
      ))}

      <Sequence durationInFrames={30} from={SCENE_STARTS.stats + 30}>
        <Audio src={staticFile("sfx/whip.wav")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={30} from={SCENE_STARTS.cta + 15}>
        <Audio src={staticFile("sfx/ding.wav")} volume={0.15} />
      </Sequence>
    </>
  );
}

export const LaunchVideo: React.FC = () => (
  <AbsoluteFill style={{ background: LT.bg }}>
    <Series>
      <Series.Sequence durationInFrames={SCENE.hook}>
        <SceneHook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE.logoWall}>
        <SceneLogoWall />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE.dock}>
        <SceneDock />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE.stats}>
        <SceneStats />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE.cta}>
        <SceneCta />
      </Series.Sequence>
    </Series>
    <AbsoluteFill>
      <LaunchAudio />
    </AbsoluteFill>
  </AbsoluteFill>
);
