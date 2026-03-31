import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const fontsDir = join(import.meta.dir, "..", "src", "fonts");

const FONTS = [
  {
    family: "Geist",
    file: "geist-latin.woff2",
    weights: [400, 500, 600],
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Geist Mono",
    file: "geist-mono-latin.woff2",
    weights: [400],
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
] as const;

const rules: string[] = [];

for (const font of FONTS) {
  const filePath = join(fontsDir, font.file);
  const buffer = readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const dataUri = `data:font/woff2;base64,${base64}`;

  for (const weight of font.weights) {
    rules.push(`@font-face {
  font-family: '${font.family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url("${dataUri}") format('woff2');
  unicode-range: ${font.unicodeRange};
}`);
  }
}

const css = `${rules.join("\n\n")}\n`;
const outPath = join(fontsDir, "..", "fonts.css");
writeFileSync(outPath, css);

const sizeKB = (Buffer.byteLength(css) / 1024).toFixed(1);
console.log(
  `Generated fonts.css (${sizeKB} KB) with ${rules.length} @font-face rules`
);
