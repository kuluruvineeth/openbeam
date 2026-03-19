import { Howl } from "howler";
import useAudio from "../store/use-audio";

export const SFX = {
  gridSnap: "/audios/sfx/grid_snap.mp3",
  itemDelete: "/audios/sfx/item_delete.mp3",
  itemPick: "/audios/sfx/item_pick.mp3",
  itemPlace: "/audios/sfx/item_place.mp3",
  itemRotate: "/audios/sfx/item_rotate.mp3",
  structureBuild: "/audios/sfx/structure_build.mp3",
  structureDelete: "/audios/sfx/structure_delete.mp3",
} as const;

export type SFXName = keyof typeof SFX;

const sfxCache = new Map<SFXName, Howl>();

for (const [name, path] of Object.entries(SFX)) {
  const sound = new Howl({
    src: [path],
    preload: true,
    volume: 0.5,
  });
  sfxCache.set(name as SFXName, sound);
}

export function playSFX(name: SFXName) {
  const sound = sfxCache.get(name);
  if (!sound) {
    return;
  }

  const { masterVolume, sfxVolume, muted } = useAudio.getState();

  if (muted) {
    return;
  }

  const finalVolume = (masterVolume / 100) * (sfxVolume / 100);
  sound.volume(finalVolume);
  sound.play();
}

export function updateSFXVolumes() {
  const { masterVolume, sfxVolume } = useAudio.getState();
  const finalVolume = (masterVolume / 100) * (sfxVolume / 100);

  for (const sound of sfxCache.values()) {
    sound.volume(finalVolume);
  }
}
