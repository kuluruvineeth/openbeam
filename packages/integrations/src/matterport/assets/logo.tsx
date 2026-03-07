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
    <path d="M8 38V16l8 8v14H8Z" fill="#FF3158" />
    <path d="M16 38V24l8-8v22h-8Z" fill="#E0234E" />
    <path d="M24 38V16l8 8v14h-8Z" fill="#FF3158" />
    <path d="M32 38V24l8-8v22h-8Z" fill="#E0234E" />
    <path d="M8 16l8-8 8 8-8 8-8-8Z" fill="#FF5A7D" />
    <path d="M24 16l8-8 8 8-8 8-8-8Z" fill="#FF5A7D" />
  </svg>
);
