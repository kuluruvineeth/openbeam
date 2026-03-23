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
    <rect fill="#73C41D" height="64" rx="8" width="64" />
    <path
      d="M18 16h8.5c4.5 0 7.5 2.5 7.5 6.5 0 3-1.5 5-4 6 3 .8 5 3.2 5 6.5 0 4.5-3.2 7-8 7H18V16zm8 10.5c2 0 3.2-1 3.2-2.8 0-1.8-1.2-2.7-3.2-2.7h-3v5.5h3zm.5 11c2.2 0 3.5-1.1 3.5-3 0-1.9-1.3-3-3.5-3h-3.5v6h3.5z"
      fill="#FFFFFF"
    />
    <path
      d="M38 16h5v11.5h.2L49.5 16H55l-7 13 7.5 13h-5.8l-6.5-11.5H43V42h-5V16z"
      fill="#FFFFFF"
    />
  </svg>
);
