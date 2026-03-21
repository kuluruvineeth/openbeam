/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M40 6H8a2 2 0 00-2 2v32a2 2 0 002 2h32a2 2 0 002-2V8a2 2 0 00-2-2z"
      fill="#1976d2"
    />
    <path d="M30 14h8v8h-8z" fill="#fff" />
    <path d="M20 14h8v8h-8z" fill="#c8e6ff" />
    <path d="M10 14h8v8h-8z" fill="#fff" />
    <path d="M30 24h8v8h-8z" fill="#c8e6ff" />
    <path d="M20 24h8v8h-8z" fill="#fff" />
    <path d="M10 24h8v8h-8z" fill="#c8e6ff" />
    <path d="M30 34h8v4h-8z" fill="#fff" />
    <path d="M20 34h8v4h-8z" fill="#c8e6ff" />
    <path d="M10 34h8v4h-8z" fill="#fff" />
    <path d="M38 6H10v4h28z" fill="#0d47a1" />
    <circle cx="14" cy="8" fill="#b3d4fc" r="2" />
    <circle cx="34" cy="8" fill="#b3d4fc" r="2" />
  </svg>
);
