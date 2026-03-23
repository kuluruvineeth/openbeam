/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 256 256"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="d365a" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#003DA5" />
        <stop offset="100%" stopColor="#6B2FA0" />
      </linearGradient>
    </defs>
    <rect fill="url(#d365a)" height="256" rx="48" width="256" />
    <path
      d="M80 64h52c26.5 0 48 21.5 48 48v0c0 26.5-21.5 48-48 48h-4v32H80V64zm48 72c13.3 0 24-10.7 24-24s-10.7-24-24-24h-20v48h20z"
      fill="#FFF"
      opacity="0.9"
    />
    <circle cx="172" cy="168" fill="#FFF" opacity="0.6" r="28" />
  </svg>
);
