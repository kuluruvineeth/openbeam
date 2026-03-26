/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 78 67"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M38.7 0h38.7l19.3 33.3-19.3 33.3H38.7L19.4 33.3 38.7 0z"
      fill="#FF5200"
    />
  </svg>
);
