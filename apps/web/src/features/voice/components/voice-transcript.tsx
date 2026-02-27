"use client";

import { useVoiceStore } from "../stores/voice-store";

export function VoiceTranscript() {
  const transcript = useVoiceStore((s) => s.transcript);
  const interimTranscript = useVoiceStore((s) => s.interimTranscript);

  if (!(transcript || interimTranscript)) {
    return null;
  }

  return (
    <div className="rounded-sm border border-border/30 bg-muted/20 px-3 py-2">
      <p className="text-sm leading-relaxed">
        {transcript}
        {interimTranscript && (
          <span className="text-muted-foreground/40">{interimTranscript}</span>
        )}
      </p>
    </div>
  );
}
