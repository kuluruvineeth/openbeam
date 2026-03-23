/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 256 256"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#FFC829" height="256" rx="28" width="256" />
    <path
      d="M175.5 60.2c-3.4-3.4-8.9-3.4-12.3 0L73.6 149.8c-6.8 6.8-10.6 16-10.6 25.6v17.4c0 2.4 1.9 4.3 4.3 4.3h17.4c9.6 0 18.8-3.8 25.6-10.6l89.6-89.6c3.4-3.4 3.4-8.9 0-12.3L175.5 60.2zM100.1 176.3c-3.4 3.4-8 5.3-12.8 5.3H80v-7.3c0-4.8 1.9-9.4 5.3-12.8l63.5-63.5 14.8 14.8-63.5 63.5zm75.8-75.8L161.1 85.7l8.3-8.3 14.8 14.8-8.3 8.3z"
      fill="#1B1B1F"
    />
  </svg>
);
