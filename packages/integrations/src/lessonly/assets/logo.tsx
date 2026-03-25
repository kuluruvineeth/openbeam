/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 500 500"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#FFC629" height="500" rx="40" width="500" />
      <path
        d="M200 140c0-8 4-14 10-14s12 8 10 20c-4 24-16 80-20 120s-4 60 4 72c6 8 16 12 32 14s40-2 70-14c12-4 22-10 28-14"
        fill="none"
        stroke="#2D2D2D"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="28"
      />
      <circle
        cx="205"
        cy="155"
        fill="none"
        r="18"
        stroke="#2D2D2D"
        strokeWidth="28"
      />
      <circle
        cx="220"
        cy="335"
        fill="none"
        r="16"
        stroke="#2D2D2D"
        strokeWidth="20"
      />
    </svg>
  );
}
