/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 600 600"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="canva-grad" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#00C4CC" />
        <stop offset="50%" stopColor="#7B2FF7" />
        <stop offset="100%" stopColor="#FF6F61" />
      </linearGradient>
    </defs>
    <rect fill="url(#canva-grad)" height="600" rx="96" width="600" />
    <path
      d="M386.4 197.8c-16.2-24.4-44.2-39.8-76.4-39.8-62.8 0-113.6 62.4-113.6 139.6 0 49.2 24 89.6 60.8 104.4 4.4 1.8 8.4 2.6 12 2.6 10.4 0 17.2-7.2 17.2-18.8 0-5.2-1.6-11.2-4.6-18.2-10.8-25.2-16.8-50-16.8-70 0-48.8 27.6-87.6 63.2-87.6 24 0 39.8 17.2 39.8 43.8 0 32-16.2 70.2-37.6 87.2-6 4.8-8.6 10.6-8.6 17.4 0 10 7 18.2 17.8 18.2 3.2 0 6.8-0.8 10.6-2.8 36.8-18.6 63-70.2 63-123.4 0-30-10.2-52.6-26.8-52.6z"
      fill="#FFFFFF"
    />
  </svg>
);
