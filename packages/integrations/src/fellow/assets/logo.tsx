/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      fill="none"
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="fel_bg"
          x1="0"
          x2="64"
          y1="0"
          y2="64"
        >
          <stop stopColor="#1A0A3E" />
          <stop offset="1" stopColor="#4A1A8A" />
        </linearGradient>
      </defs>
      <rect fill="url(#fel_bg)" height="64" rx="14" width="64" />
      <g fill="#fff">
        <path
          d="M32 18c-2.5 0-4.5 5.5-4.5 10s-5.5 4.5-10 4.5S13 35 18 35s4.5 5.5 4.5 10S25.5 50 28 47s4-6.5 4-15-2.5-14-4-14z"
          opacity="0.9"
        />
        <path
          d="M32 18c2.5 0 4.5 5.5 4.5 10s5.5 4.5 10 4.5S51 35 46 35s-4.5 5.5-4.5 10-3 5-5.5 2-4-6.5-4-15 2.5-14 4-14z"
          opacity="0.9"
        />
        <path
          d="M44 20l1.5 3 3 1.5-3 1.5L44 29l-1.5-3-3-1.5 3-1.5z"
          opacity="0.7"
        />
        <path d="M50 34l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" opacity="0.5" />
        <path d="M20 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" opacity="0.5" />
      </g>
    </svg>
  );
}
