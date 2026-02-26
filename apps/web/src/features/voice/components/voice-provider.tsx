"use client";

import { useVoiceHotkey } from "../hooks/use-voice-hotkey";
import { VoiceOverlay } from "./voice-overlay";

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  useVoiceHotkey();

  return (
    <>
      {children}
      <VoiceOverlay />
    </>
  );
}
