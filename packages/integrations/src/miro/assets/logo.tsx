/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="417 120.6 338 338"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m490.2 120.6h191.5c40.4 0 73.2 32.8 73.2 73.2v191.5c0 40.4-32.8 73.2-73.2 73.2h-191.5c-40.4 0-73.2-32.8-73.2-73.2v-191.5c0-40.4 32.8-73.2 73.2-73.2z"
      fill="#FFD02F"
    />
    <path
      d="m651.8 162.8h-37.1l30.9 54.3-68-54.3h-37.1l34 66.4-71.1-66.4h-37.1l37.1 84.5-37.1 169h37.1l71.1-181.1-34 181.1h37.1l68-193.1-30.9 193.1h37.1l68-211.3z"
      fill="#050038"
    />
  </svg>
);
