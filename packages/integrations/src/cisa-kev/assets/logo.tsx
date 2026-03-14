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
    <path
      d="M24 4L8 12v12c0 10.667 6.667 20 16 24 9.333-4 16-13.333 16-24V12L24 4Z"
      fill="#BF0A30"
    />
    <path
      d="M24 4L8 12v12c0 10.667 6.667 20 16 24 9.333-4 16-13.333 16-24V12L24 4Z"
      fill="none"
      stroke="#8C0723"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <rect fill="#FFFFFF" height="12" rx="1.5" width="3" x="22.5" y="15" />
    <circle cx="24" cy="32" fill="#FFFFFF" r="2" />
  </svg>
);
