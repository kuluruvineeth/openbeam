let lastDictationTranscript = "";

export function setLastDictationTranscript(transcript: string): void {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return;
  }
  lastDictationTranscript = trimmed;
}

export function getLastDictationTranscript(): string {
  return lastDictationTranscript;
}

export function clearLastDictationTranscript(): void {
  lastDictationTranscript = "";
}

export function resetLastDictationTranscriptForTests(): void {
  clearLastDictationTranscript();
}
