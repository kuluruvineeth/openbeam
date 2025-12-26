import type { TranscriptSegment } from "@/lib/media-types";

export type GroupedSegment = {
  start: number;
  end: number;
  words: TranscriptSegment[];
};

export function groupSegments(
  segments: TranscriptSegment[],
  windowSec = 3
): GroupedSegment[] {
  if (!segments.length) {
    return [];
  }

  const groups: GroupedSegment[] = [];
  let currentGroup: GroupedSegment = {
    start: segments[0].start,
    end: segments[0].end,
    words: [segments[0]],
  };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.start - currentGroup.start < windowSec) {
      currentGroup.end = Math.max(currentGroup.end, seg.end);
      currentGroup.words.push(seg);
    } else {
      groups.push(currentGroup);
      currentGroup = { start: seg.start, end: seg.end, words: [seg] };
    }
  }
  groups.push(currentGroup);

  return groups;
}
