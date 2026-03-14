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
    <path d="M24 4L8 13v22l16 9 16-9V13L24 4Z" fill="#002868" />
    <path
      d="M24 4L8 13v22l16 9 16-9V13L24 4Z"
      fill="none"
      stroke="#001A44"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <circle cx="18" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="24" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="30" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="18" cy="28" fill="#FFFFFF" r="2" />
    <circle cx="24" cy="28" fill="#FFFFFF" r="2" />
    <circle cx="30" cy="28" fill="#FFFFFF" r="2" />
    <path d="M18 22v4M24 22v4M30 22v4" stroke="#FFFFFF" strokeWidth="1.2" />
  </svg>
);
