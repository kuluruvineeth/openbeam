import type React from "react";
import {
  Audio,
  Composition,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  TOTAL_FRAMES as CHANGELOG_TOTAL,
  ChangelogVideo,
} from "./changelog/changelog-video";
import { SceneFeedback } from "./changelog/scenes/scene-feedback";
import { SceneGitHub } from "./changelog/scenes/scene-github";
import { SceneLanding } from "./changelog/scenes/scene-landing";
import { SceneResults } from "./changelog/scenes/scene-results";
import { OpenBeamFeatures } from "./compositions/features";
import { OpenBeamIntro } from "./compositions/intro";
import { SlideBusiness } from "./compositions/slides/slide-business";
import { SlideClose } from "./compositions/slides/slide-close";
import { SlideCompetition } from "./compositions/slides/slide-competition";
import { SlideCta } from "./compositions/slides/slide-cta";
import { SlideDemoLive } from "./compositions/slides/slide-demo-live";
import { SlideDemoPhysical } from "./compositions/slides/slide-demo-physical";
import { SlideDemoSearch } from "./compositions/slides/slide-demo-search";
import { SlideEdge } from "./compositions/slides/slide-edge";
import { SlideFinancials } from "./compositions/slides/slide-financials";
import { SlideGtm } from "./compositions/slides/slide-gtm";
import { SlideMarket } from "./compositions/slides/slide-market";
import { SlideMoat } from "./compositions/slides/slide-moat";
import { SlideProblem } from "./compositions/slides/slide-problem";
import { SlideSolution } from "./compositions/slides/slide-solution";
import { SlideTeam } from "./compositions/slides/slide-team";
import { SlideTitle } from "./compositions/slides/slide-title";
import { SlideVision } from "./compositions/slides/slide-vision";
import { SlideWhyNow } from "./compositions/slides/slide-why-now";
import { LAUNCH_TOTAL_FRAMES, LaunchVideo } from "./launch/launch-video";
import "./index.css";

const SLIDES = [
  { id: "SlideTitle", component: SlideTitle },
  { id: "SlideProblem", component: SlideProblem },
  { id: "SlideWhyNow", component: SlideWhyNow },
  { id: "SlideSolution", component: SlideSolution },
  { id: "SlideDemoSearch", component: SlideDemoSearch },
  { id: "SlideDemoLive", component: SlideDemoLive, frames: 780 },
  { id: "SlideDemoPhysical", component: SlideDemoPhysical },
  { id: "SlideEdge", component: SlideEdge },
  { id: "SlideMoat", component: SlideMoat },
  { id: "SlideMarket", component: SlideMarket },
  { id: "SlideCompetition", component: SlideCompetition },
  { id: "SlideBusiness", component: SlideBusiness },
  { id: "SlideGtm", component: SlideGtm },
  { id: "SlideFinancials", component: SlideFinancials },
  { id: "SlideVision", component: SlideVision },
  { id: "SlideTeam", component: SlideTeam },
  { id: "SlideClose", component: SlideClose },
  { id: "SlideCta", component: SlideCta, frames: 360 },
] as const;

const FRAMES_PER_SLIDE = 240;
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

function slideFrames(s: (typeof SLIDES)[number]): number {
  return "frames" in s ? s.frames : FRAMES_PER_SLIDE;
}

const TOTAL_DECK_FRAMES = SLIDES.reduce((sum, s) => sum + slideFrames(s), 0);

const SWOOSH_DURATION = 45;
const DIGITAL_REVEAL_DURATION = 6;
const IMPACT_DURATION = 36;
const PING_DURATION = 57;
const RISE_DURATION = 45;
const BOOM_DURATION = 111;
const KEYPRESS_DURATION = 3;

function buildKeypressFrames(
  text: string,
  absStart: number,
  charsPerFrame: number
): number[] {
  return Array.from(
    { length: text.length },
    (_, i) => absStart + Math.floor(i / charsPerFrame)
  ).filter((f, i, arr) => i === 0 || f !== arr[i - 1]);
}

const SLIDE_STARTS = SLIDES.reduce<number[]>((acc, _s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + slideFrames(SLIDES[i - 1]));
  return acc;
}, []);

const SEARCH_KEYPRESS_FRAMES = buildKeypressFrames(
  "why did pressure spike on Line 3?",
  SLIDE_STARTS[4] + 70,
  0.6
);

const LIVE_KEYPRESS_FRAMES = buildKeypressFrames(
  "log4shell",
  SLIDE_STARTS[5] + 125,
  0.8
);

const CTA_KEYPRESS_FRAMES = buildKeypressFrames(
  "app.openbeam.work/explore",
  SLIDE_STARTS[5] + 700,
  0.4
);

const CLI_KEYPRESS_FRAMES = buildKeypressFrames(
  "$ openbeam deploy --mode air-gapped",
  SLIDE_STARTS[7] + 150,
  0.6
);

const ENDCTA_KEYPRESS_FRAMES = buildKeypressFrames(
  "app.openbeam.work/explore",
  SLIDE_STARTS[SLIDES.length - 1] + 125,
  0.3
);

const SLIDE_TRANSITION_FRAMES = SLIDE_STARTS.slice(1).map(
  (start) => start - 10
);

const PitchDeckAudio: React.FC = () => {
  const frame = useCurrentFrame();

  const musicVolume = interpolate(
    frame,
    [
      0,
      90,
      TOTAL_DECK_FRAMES - 220,
      TOTAL_DECK_FRAMES - 160,
      TOTAL_DECK_FRAMES - 120,
      TOTAL_DECK_FRAMES,
    ],
    [0, 0.45, 0.2, 0.45, 0.45, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      <Audio loop src={staticFile("bg-music.m4a")} volume={musicVolume} />

      {SLIDE_TRANSITION_FRAMES.map((f) => (
        <Sequence
          durationInFrames={SWOOSH_DURATION}
          from={f}
          key={`swoosh-${f}`}
        >
          <Audio src={staticFile("sfx-swoosh2.m4a")} volume={0.12} />
        </Sequence>
      ))}

      <Sequence durationInFrames={DIGITAL_REVEAL_DURATION} from={325}>
        <Audio src={staticFile("sfx-digital-reveal.m4a")} volume={0.08} />
      </Sequence>
      <Sequence durationInFrames={DIGITAL_REVEAL_DURATION} from={340}>
        <Audio src={staticFile("sfx-digital-reveal.m4a")} volume={0.08} />
      </Sequence>
      <Sequence durationInFrames={DIGITAL_REVEAL_DURATION} from={355}>
        <Audio src={staticFile("sfx-digital-reveal.m4a")} volume={0.08} />
      </Sequence>

      <Sequence durationInFrames={IMPACT_DURATION} from={40}>
        <Audio src={staticFile("sfx-impact.m4a")} volume={0.15} />
      </Sequence>
      <Sequence durationInFrames={IMPACT_DURATION} from={SLIDE_STARTS[4] + 65}>
        <Audio src={staticFile("sfx-impact.m4a")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={IMPACT_DURATION} from={SLIDE_STARTS[5] + 465}>
        <Audio src={staticFile("sfx-impact.m4a")} volume={0.12} />
      </Sequence>

      <Sequence durationInFrames={PING_DURATION} from={SLIDE_STARTS[6] + 75}>
        <Audio src={staticFile("sfx-ping.m4a")} volume={0.06} />
      </Sequence>
      <Sequence durationInFrames={PING_DURATION} from={SLIDE_STARTS[6] + 95}>
        <Audio src={staticFile("sfx-ping.m4a")} volume={0.06} />
      </Sequence>
      <Sequence durationInFrames={PING_DURATION} from={SLIDE_STARTS[6] + 115}>
        <Audio src={staticFile("sfx-ping.m4a")} volume={0.06} />
      </Sequence>
      <Sequence durationInFrames={PING_DURATION} from={SLIDE_STARTS[6] + 135}>
        <Audio src={staticFile("sfx-ping.m4a")} volume={0.06} />
      </Sequence>

      {SEARCH_KEYPRESS_FRAMES.map((f, i) => (
        <Sequence
          durationInFrames={KEYPRESS_DURATION}
          from={f}
          key={`skey-${f}-${i}`}
        >
          <Audio
            src={staticFile("sfx-keypress.mp3")}
            volume={0.08 + (i % 3) * 0.02}
          />
        </Sequence>
      ))}

      {LIVE_KEYPRESS_FRAMES.map((f, i) => (
        <Sequence
          durationInFrames={KEYPRESS_DURATION}
          from={f}
          key={`lkey-${f}-${i}`}
        >
          <Audio
            src={staticFile("sfx-keypress.mp3")}
            volume={0.1 + (i % 3) * 0.02}
          />
        </Sequence>
      ))}

      {CLI_KEYPRESS_FRAMES.map((f, i) => (
        <Sequence
          durationInFrames={KEYPRESS_DURATION}
          from={f}
          key={`ckey-${f}-${i}`}
        >
          <Audio
            src={staticFile("sfx-keypress.mp3")}
            volume={0.1 + (i % 3) * 0.02}
          />
        </Sequence>
      ))}

      {CTA_KEYPRESS_FRAMES.map((f, i) => (
        <Sequence
          durationInFrames={KEYPRESS_DURATION}
          from={f}
          key={`ctakey-${f}-${i}`}
        >
          <Audio
            src={staticFile("sfx-keypress.mp3")}
            volume={0.06 + (i % 3) * 0.01}
          />
        </Sequence>
      ))}

      {ENDCTA_KEYPRESS_FRAMES.map((f, i) => (
        <Sequence
          durationInFrames={KEYPRESS_DURATION}
          from={f}
          key={`endctakey-${f}-${i}`}
        >
          <Audio src={staticFile("sfx-keypress.mp3")} volume={0.05} />
        </Sequence>
      ))}

      <Sequence durationInFrames={RISE_DURATION} from={SLIDE_STARTS[14] + 15}>
        <Audio src={staticFile("sfx-rise.m4a")} volume={0.15} />
      </Sequence>

      <Sequence durationInFrames={BOOM_DURATION} from={SLIDE_STARTS[14] + 30}>
        <Audio src={staticFile("sfx-boom.m4a")} volume={0.25} />
      </Sequence>
    </>
  );
};

const PitchDeck: React.FC = () => (
  <>
    <PitchDeckAudio />
    <Series>
      {SLIDES.map((slide) => (
        <Series.Sequence durationInFrames={slideFrames(slide)} key={slide.id}>
          <slide.component />
        </Series.Sequence>
      ))}
    </Series>
  </>
);

export const Root: React.FC = () => (
  <>
    <Composition
      component={ChangelogVideo}
      defaultProps={{
        version: "v0.0.2",
        tagline: "Your Feedback Builds the Product",
        date: "March 2026",
        music: "music/changelog-v2-5-0.mp3",
      }}
      durationInFrames={CHANGELOG_TOTAL}
      fps={FPS}
      height={HEIGHT}
      id="Changelog-v2-5-0"
      width={WIDTH}
    />

    <Composition
      component={LaunchVideo}
      durationInFrames={LAUNCH_TOTAL_FRAMES}
      fps={FPS}
      height={HEIGHT}
      id="MCP-Launch"
      width={WIDTH}
    />

    <Composition
      component={PitchDeck}
      durationInFrames={TOTAL_DECK_FRAMES}
      fps={FPS}
      height={HEIGHT}
      id="PitchDeck"
      width={WIDTH}
    />

    {SLIDES.map((slide) => (
      <Composition
        component={slide.component}
        durationInFrames={slideFrames(slide)}
        fps={FPS}
        height={HEIGHT}
        id={slide.id}
        key={slide.id}
        width={WIDTH}
      />
    ))}

    <Composition
      component={OpenBeamIntro}
      durationInFrames={180}
      fps={FPS}
      height={HEIGHT}
      id="Intro"
      width={WIDTH}
    />
    <Composition
      component={OpenBeamFeatures}
      durationInFrames={300}
      fps={FPS}
      height={HEIGHT}
      id="Features"
      width={WIDTH}
    />

    <Composition
      component={SceneLanding}
      durationInFrames={240}
      fps={FPS}
      height={HEIGHT}
      id="CL-v250-Scene1-Landing"
      width={WIDTH}
    />
    <Composition
      component={SceneResults}
      durationInFrames={360}
      fps={FPS}
      height={HEIGHT}
      id="CL-v250-Scene2-Results"
      width={WIDTH}
    />
    <Composition
      component={SceneFeedback}
      durationInFrames={420}
      fps={FPS}
      height={HEIGHT}
      id="CL-v250-Scene3-Feedback"
      width={WIDTH}
    />
    <Composition
      component={SceneGitHub}
      durationInFrames={420}
      fps={FPS}
      height={HEIGHT}
      id="CL-v250-Scene4-GitHub"
      width={WIDTH}
    />
  </>
);
