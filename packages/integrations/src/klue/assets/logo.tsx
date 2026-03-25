/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8h16v34.5L54.5 8H75L46 42.5 77 92H56L32 53l-4 4.5V92H12V8z"
        fill="#1A1A1A"
      />
    </svg>
  );
}
