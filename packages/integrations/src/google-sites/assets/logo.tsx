/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 192 192"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M152 24H88L72 40v128c0 8.84 7.16 16 16 16h64c8.84 0 16-7.16 16-16V40c0-8.84-7.16-16-16-16z"
      fill="#4285F4"
    />
    <path d="M88 24L72 40h16V24z" fill="#3367D6" />
    <path
      d="M40 64H24c-8.84 0-16 7.16-16 16v88c0 8.84 7.16 16 16 16h64c8.84 0 16-7.16 16-16v-16H56c-8.84 0-16-7.16-16-16V64z"
      fill="#185ABC"
    />
    <rect fill="#ffffff" height="8" rx="4" width="48" x="96" y="72" />
    <rect fill="#ffffff" height="8" rx="4" width="48" x="96" y="96" />
    <rect fill="#ffffff" height="8" rx="4" width="32" x="96" y="120" />
  </svg>
);
