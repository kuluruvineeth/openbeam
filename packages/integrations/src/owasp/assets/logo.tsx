/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo component
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="19"
      stroke="#1D7AD7"
      strokeWidth="2.5"
    />
    <ellipse
      cx="24"
      cy="24"
      fill="none"
      rx="8"
      ry="19"
      stroke="#1D7AD7"
      strokeWidth="1.5"
    />
    <path d="M5 24h38" stroke="#1D7AD7" strokeWidth="1.5" />
    <path d="M8 14h32" stroke="#1D7AD7" strokeWidth="1" />
    <path d="M8 34h32" stroke="#1D7AD7" strokeWidth="1" />
    <rect fill="#1D7AD7" height="11" rx="3" width="14" x="17" y="17" />
    <rect
      fill="none"
      height="11"
      rx="3"
      stroke="#1565B0"
      strokeWidth="1"
      width="14"
      x="17"
      y="17"
    />
    <rect fill="#FFFFFF" height="4" rx="0.5" width="1.5" x="23.25" y="20" />
    <circle cx="24" cy="26" fill="#FFFFFF" r="1" />
  </svg>
);
