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
    <defs>
      <linearGradient id="st-g" x1="0" x2="1" y1="1" y2="0">
        <stop offset="0" stopColor="#3B6BB2" />
        <stop offset="1" stopColor="#16B0C0" />
      </linearGradient>
    </defs>
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="24"
      x2="24"
      y1="8"
      y2="40"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="24"
      x2="10.2"
      y1="8"
      y2="16"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="24"
      x2="37.8"
      y1="8"
      y2="16"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="24"
      x2="10.2"
      y1="40"
      y2="32"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="24"
      x2="37.8"
      y1="40"
      y2="32"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="10.2"
      x2="10.2"
      y1="16"
      y2="32"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="37.8"
      x2="37.8"
      y1="16"
      y2="32"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="10.2"
      x2="37.8"
      y1="16"
      y2="32"
    />
    <line
      stroke="url(#st-g)"
      strokeWidth="2.5"
      x1="37.8"
      x2="10.2"
      y1="16"
      y2="32"
    />
    <circle cx="24" cy="8" fill="url(#st-g)" r="5" />
    <circle cx="24" cy="40" fill="url(#st-g)" r="5" />
    <circle cx="10.2" cy="16" fill="url(#st-g)" r="5" />
    <circle cx="37.8" cy="16" fill="url(#st-g)" r="5" />
    <circle cx="10.2" cy="32" fill="url(#st-g)" r="5" />
    <circle cx="37.8" cy="32" fill="url(#st-g)" r="5" />
  </svg>
);
