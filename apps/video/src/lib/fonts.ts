import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadHedvigSans } from "@remotion/google-fonts/HedvigLettersSans";
import { loadFont as loadHedvigSerif } from "@remotion/google-fonts/HedvigLettersSerif";

const hedvigSans = loadHedvigSans("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const hedvigSerif = loadHedvigSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const geistMono = loadGeistMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const FONTS = {
  serif: hedvigSerif.fontFamily,
  sans: hedvigSans.fontFamily,
  mono: geistMono.fontFamily,
} as const;
