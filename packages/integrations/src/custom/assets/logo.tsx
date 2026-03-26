/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 80 80"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#18181B" height="80" rx="4" width="80" x="0" y="0" />
    <path
      d="M28 34a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V34z"
      fill="none"
      stroke="#A1A1AA"
      strokeWidth="2"
    />
    <path
      d="M40 28V22M40 58v-6M28 40H22M58 40h-6"
      stroke="#A1A1AA"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <circle cx="40" cy="22" fill="#A1A1AA" r="2.5" />
    <circle cx="40" cy="58" fill="#A1A1AA" r="2.5" />
    <circle cx="22" cy="40" fill="#A1A1AA" r="2.5" />
    <circle cx="58" cy="40" fill="#A1A1AA" r="2.5" />
    <path d="M37 37h6v6h-6z" fill="#A1A1AA" rx="1" />
  </svg>
);
