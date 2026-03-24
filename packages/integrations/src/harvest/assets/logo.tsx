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
    <rect fill="#FA5D00" height="256" rx="28" width="256" />
    <g fill="#FFF">
      <rect height="100" rx="6" width="16" x="44" y="78" />
      <rect height="140" rx="6" width="16" x="68" y="58" />
      <rect height="80" rx="6" width="16" x="92" y="88" />
      <path
        d="M108 128c0-4 2-8 6-10l20-12c4-3 8-3 12 0l20 12c4 2 6 6 6 10"
        fill="none"
        stroke="#FFF"
        strokeLinecap="round"
        strokeWidth="14"
      />
      <rect height="80" rx="6" width="16" x="148" y="88" />
      <rect height="140" rx="6" width="16" x="172" y="58" />
      <rect height="100" rx="6" width="16" x="196" y="78" />
    </g>
  </svg>
);
