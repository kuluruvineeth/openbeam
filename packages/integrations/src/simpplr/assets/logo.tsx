/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      fill="none"
      height={size}
      viewBox="0 0 60 60"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#1A1A1A" height="4" rx="1" width="22" x="19" y="8" />
      <path
        d="M30 16c-7.18 0-13 5.82-13 13 0 3.59 1.46 6.84 3.82 9.18C23.16 40.54 26.41 42 30 42c7.18 0 13-5.82 13-13S37.18 16 30 16zm0 5c2.07 0 3.89.8 5.3 2.06-1.06.71-2.33 1.15-3.8 1.4-1.34.23-2.77.18-4.14-.14C27.09 23.22 28.44 21 30 21zm-7 8c0-1.36.39-2.63 1.06-3.7 1.68.56 3.42.77 5.09.53 1.8-.25 3.39-.88 4.71-1.83.98.8 1.74 1.84 2.14 3H24.5c-.31-.63-.5-1.29-.5-2zm7 8c-3.31 0-6-2.69-6-6h1.5c0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5H36c0 3.31-2.69 6-6 6z"
        fill="#1A1A1A"
      />
      <rect fill="#1A1A1A" height="4" rx="1" width="22" x="19" y="48" />
    </svg>
  );
}
