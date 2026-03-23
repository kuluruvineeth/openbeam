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
    <circle cx="128" cy="128" fill="#017737" r="128" />
    <path
      d="M108.5 67.8c-14 0-22.1 6.3-26 10.6-.5-3.7-2.9-8.6-12.6-8.6H49.6v23.5h8.6c1.5 0 1.9.5 1.9 1.9v100h25V157c0-1-.02-2-.05-2.8 3.9 3.6 11.4 8.5 23 8.5 24.4 0 41.5-19.3 41.5-47 0-28.1-16.2-47-40.3-47zm-5.1 72.3c-13.4 0-19.5-12.9-19.5-24.8 0-18.8 10.3-25.5 19.9-25.5 11.8 0 19.7 10.2 19.7 25.3 0 17.3-10.1 25-20.1 25z"
      fill="#FFF"
    />
  </svg>
);
