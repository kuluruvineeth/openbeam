import mitt from "mitt";
import { playSFX } from "./sfx-player";

type SFXEvents = {
  "sfx:grid-snap": undefined;
  "sfx:item-delete": undefined;
  "sfx:item-pick": undefined;
  "sfx:item-place": undefined;
  "sfx:item-rotate": undefined;
  "sfx:structure-build": undefined;
  "sfx:structure-delete": undefined;
};

export const sfxEmitter = mitt<SFXEvents>();

export function initSFXBus() {
  sfxEmitter.on("sfx:grid-snap", () => playSFX("gridSnap"));
  sfxEmitter.on("sfx:item-delete", () => playSFX("itemDelete"));
  sfxEmitter.on("sfx:item-pick", () => playSFX("itemPick"));
  sfxEmitter.on("sfx:item-place", () => playSFX("itemPlace"));
  sfxEmitter.on("sfx:item-rotate", () => playSFX("itemRotate"));
  sfxEmitter.on("sfx:structure-build", () => playSFX("structureBuild"));
  sfxEmitter.on("sfx:structure-delete", () => playSFX("structureDelete"));
}

export function triggerSFX(event: keyof SFXEvents) {
  sfxEmitter.emit(event);
}
