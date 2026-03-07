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
    <path d="M10 10h5l9 20 9-20h5L26 42h-4L10 10Z" fill="#1A1A2E" />
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="2"
      stroke="#4361EE"
      strokeWidth="1.5"
    />
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="6"
      stroke="#4361EE"
      strokeDasharray="3 3"
      strokeWidth="1"
    />
  </svg>
);
