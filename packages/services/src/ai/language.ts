import { franc } from "franc";

interface LanguageResult {
  iso6391: string;
  confidence: "high" | "medium" | "low";
}

const MIN_TEXT_LENGTH = 30;
const DEFAULT_LANGUAGE: LanguageResult = { iso6391: "en", confidence: "low" };

const SCRIPT_PATTERNS: [RegExp, string][] = [
  [/[\u0600-\u06FF\u0750-\u077F]/u, "ar"],
  [/[\u4E00-\u9FFF\u3400-\u4DBF]/u, "zh"],
  [/[\u3040-\u309F\u30A0-\u30FF]/u, "ja"],
  [/[\uAC00-\uD7AF\u1100-\u11FF]/u, "ko"],
  [/[\u0900-\u097F]/u, "hi"],
  [/[\u0400-\u04FF]/u, "ru"],
  [/[\u0E00-\u0E7F]/u, "th"],
  [/[\u0590-\u05FF]/u, "he"],
  [/[\u0980-\u09FF]/u, "bn"],
  [/[\u0B80-\u0BFF]/u, "ta"],
  [/[\u0C00-\u0C7F]/u, "te"],
];

const ISO3_TO_ISO1: Record<string, string> = {
  ara: "ar",
  ben: "bn",
  cmn: "zh",
  deu: "de",
  eng: "en",
  fas: "fa",
  fra: "fr",
  hin: "hi",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tam: "ta",
  tel: "te",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  vie: "vi",
  zho: "zh",
  heb: "he",
};

export function detectLanguage(text: string): LanguageResult {
  if (text.length < MIN_TEXT_LENGTH) {
    return DEFAULT_LANGUAGE;
  }

  for (const [pattern, lang] of SCRIPT_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gu"));
    if (matches && matches.length >= 3) {
      return { iso6391: lang, confidence: "high" };
    }
  }

  const iso3 = franc(text);
  if (iso3 === "und") {
    return DEFAULT_LANGUAGE;
  }

  const iso1 = ISO3_TO_ISO1[iso3];
  if (!iso1) {
    return DEFAULT_LANGUAGE;
  }

  return {
    iso6391: iso1,
    confidence: text.length > 100 ? "high" : "medium",
  };
}
