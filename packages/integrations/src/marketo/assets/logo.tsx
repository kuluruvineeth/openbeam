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
    <rect fill="#5C4C9F" height="256" rx="28" width="256" />
    <path
      d="M176.2 56v144l-30.4-22.8V96.6L113 132.1 80.2 96.6v80.6L49.8 200V56l65.6 72.4L176.2 56z"
      fill="#FFFFFF"
    />
    <path d="M206.2 200l-30-22.8V78.8L206.2 56v144z" fill="#FFFFFF" />
  </svg>
);
