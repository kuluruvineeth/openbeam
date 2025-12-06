function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (!(a && b)) {
    return 0;
  }

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) {
    return 1;
  }
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  let matches = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i += 1) {
    if (a[i] === b[i]) {
      matches += 1;
    }
  }
  return matches / longer.length;
}

type MatchResult = { start: number; end: number } | null;

export function findBestMatch(
  haystack: string,
  needle: string,
  threshold = 0.7
): MatchResult {
  const normHaystack = normalizeText(haystack);
  const normNeedle = normalizeText(needle);

  if (!normNeedle || normNeedle.length < 10) {
    return null;
  }

  const searchNeedle =
    normNeedle.length > 200 ? normNeedle.slice(0, 200) : normNeedle;
  const windowSize = Math.min(searchNeedle.length + 50, normHaystack.length);

  let bestScore = 0;
  let bestStart = -1;

  for (let i = 0; i <= normHaystack.length - searchNeedle.length; i += 1) {
    const window = normHaystack.slice(i, i + windowSize);
    const idx = window.indexOf(searchNeedle.slice(0, 50));

    if (idx !== -1) {
      const matchWindow = window.slice(idx, idx + searchNeedle.length);
      const score = calculateSimilarity(matchWindow, searchNeedle);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestStart = i + idx;
      }
    }
  }

  if (bestStart === -1) {
    return null;
  }
  return { start: bestStart, end: bestStart + searchNeedle.length };
}

export function highlightTextInPage(
  container: HTMLElement,
  searchText: string
): HTMLElement | null {
  const textLayer = container.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) {
    return null;
  }

  const spans = textLayer.querySelectorAll("span");
  if (spans.length === 0) {
    return null;
  }

  const textParts: { span: HTMLSpanElement; text: string; start: number }[] =
    [];
  let fullText = "";

  for (const span of spans) {
    const text = span.textContent ?? "";
    textParts.push({
      span: span as HTMLSpanElement,
      text,
      start: fullText.length,
    });
    fullText += `${text} `;
  }

  const match = findBestMatch(fullText, searchText);
  if (!match) {
    return null;
  }

  let firstHighlighted: HTMLElement | null = null;

  for (const part of textParts) {
    const spanStart = part.start;
    const spanEnd = spanStart + part.text.length;

    if (spanEnd > match.start && spanStart < match.end) {
      part.span.style.backgroundColor = "rgba(255, 230, 0, 0.4)";
      part.span.style.borderRadius = "2px";
      part.span.style.transition = "background-color 0.3s ease";
      if (!firstHighlighted) {
        firstHighlighted = part.span;
      }
    }
  }

  return firstHighlighted;
}

export function clearHighlights(container: HTMLElement) {
  const textLayer = container.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) {
    return;
  }

  for (const span of textLayer.querySelectorAll("span")) {
    (span as HTMLElement).style.backgroundColor = "";
    (span as HTMLElement).style.borderRadius = "";
  }
}

export const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5] as const;
