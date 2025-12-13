export function generateWaveformData(length: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const base = Math.sin(i * 0.1) * 0.3 + 0.5;
    const variation = Math.random() * 0.4 - 0.2;
    data.push(Math.max(0.15, Math.min(1, base + variation)));
  }
  return data;
}

export function extractTimestamps(text: string): number[] {
  const regex = /(\d{1,2}):(\d{2})(?::(\d{2}))?/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => {
    const hours = m[3] ? Number.parseInt(m[1], 10) : 0;
    const mins = m[3] ? Number.parseInt(m[2], 10) : Number.parseInt(m[1], 10);
    const secs = m[3] ? Number.parseInt(m[3], 10) : Number.parseInt(m[2], 10);
    return hours * 3600 + mins * 60 + secs;
  });
}
