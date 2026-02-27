const VOLUME_THRESHOLD_DB = -30;

export function detectSpeech(volumeDb: number): boolean {
  return volumeDb > VOLUME_THRESHOLD_DB;
}

export function normalizeVolume(volumeDb: number): number {
  const minDb = -60;
  const maxDb = 0;
  const clamped = Math.max(minDb, Math.min(maxDb, volumeDb));
  return (clamped - minDb) / (maxDb - minDb);
}

export { VOLUME_THRESHOLD_DB };
