/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo component
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="19" />
    <rect fill="#D4604A" height="10" rx="2" width="10" x="19" y="19" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="19" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="32" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="32" />
    <rect fill="#D4604A" height="10" rx="2" width="10" x="32" y="32" />
  </svg>
);
