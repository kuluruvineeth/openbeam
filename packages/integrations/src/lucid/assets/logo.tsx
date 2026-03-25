/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 107 107"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#282C33" height="107" rx="8" width="107" />
    <path d="M53.4603 22L32 34.404V84.0199L53.4603 71.6158V22Z" fill="white" />
    <path
      d="M74.9203 83.2472V59.2119L53.4603 71.6158V83.2472H74.9203Z"
      fill="white"
    />
  </svg>
);
