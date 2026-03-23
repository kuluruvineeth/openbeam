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
    <rect
      fill="#FFFFFF"
      height="64"
      rx="8"
      stroke="#E5E7EB"
      strokeWidth="0.5"
      width="64"
    />
    <path
      d="M32 8c-7.7 0-14.7 3.2-19.7 8.3-.3.4-.2 1 .3 1.1.9.2 1.6-.3 2.2-.9C19.5 12 25.4 9.8 32 9.8c6.6 0 12.5 2.2 17.2 6.7.6.5 1.3.8 2.2.9.5 0 .7-.6.3-1C46.7 11.2 39.7 8 32 8z"
      fill="#F49813"
    />
    <path
      d="M17 26h3.6l3.4 12L27.5 26h2.9l3.5 12L37.4 26H41l-5.6 20h-3.1L29 33l-3.3 13h-3.1L17 26z"
      fill="#3069B5"
    />
  </svg>
);
