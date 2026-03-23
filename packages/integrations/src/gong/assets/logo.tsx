/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#7C3AED" height="64" rx="8" width="64" />
    <path
      d="M32 14c-9.941 0-18 8.059-18 18s8.059 18 18 18 18-8.059 18-18-8.059-18-18-18zm0 30c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12z"
      fill="#FFFFFF"
    />
    <circle cx="32" cy="32" fill="#FFFFFF" r="5" />
    <path
      d="M32 8v4M32 52v4M8 32h4M52 32h4M15.515 15.515l2.828 2.828M45.657 45.657l2.828 2.828M15.515 48.485l2.828-2.828M45.657 18.343l2.828-2.828"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
  </svg>
);
