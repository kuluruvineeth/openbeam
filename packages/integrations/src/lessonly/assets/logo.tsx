/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#FFC629" height="64" rx="12" width="64" />
      <path d="M18 14h8v28h16v8H18V14z" fill="#1A1A2E" />
    </svg>
  );
}
