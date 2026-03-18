import { LAYOUT } from "./theme";

export const FPS = LAYOUT.fps;

export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

export function framesToSeconds(frames: number): number {
  return frames / FPS;
}

export const TIMING = {
  textFadeIn: 10,
  textSlideUp: 12,
  sceneTransition: 15,
  browserEntrance: 18,
  staggerDelay: 3,
  counterAnimation: 25,
  holdContent: 60,
  holdContentLong: 90,
  introScene: secondsToFrames(4),
  outroScene: secondsToFrames(4),
  featureSceneDefault: secondsToFrames(12),
  fixSceneDefault: secondsToFrames(6),
  improvementSceneDefault: secondsToFrames(8),
  dataSourceSceneDefault: secondsToFrames(8),
  metricSceneDefault: secondsToFrames(10),
} as const;

export function featureDurationFrames(
  category: string,
  overrideSeconds?: number
): number {
  if (overrideSeconds) {
    return secondsToFrames(overrideSeconds);
  }
  switch (category) {
    case "feature":
      return TIMING.featureSceneDefault;
    case "data-source":
      return TIMING.dataSourceSceneDefault;
    case "improvement":
      return TIMING.improvementSceneDefault;
    case "fix":
      return TIMING.fixSceneDefault;
    case "performance":
      return TIMING.metricSceneDefault;
    default:
      return TIMING.featureSceneDefault;
  }
}
