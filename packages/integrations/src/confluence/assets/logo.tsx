/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 256 246"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="confluence-a"
        x1="99.14%"
        x2="33.86%"
        y1="112.05%"
        y2="69.22%"
      >
        <stop offset="0%" stopColor="#0052CC" />
        <stop offset="92.3%" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient
        id="confluence-b"
        x1="0.86%"
        x2="66.14%"
        y1="-12.05%"
        y2="30.78%"
      >
        <stop offset="0%" stopColor="#0052CC" />
        <stop offset="92.3%" stopColor="#2684FF" />
      </linearGradient>
    </defs>
    <path
      d="M9.26 187.36c-3.69 6.08-7.79 13.1-10.54 17.87a8.08 8.08 0 0 0 2.87 11.02l57.97 35.14a8.08 8.08 0 0 0 11.06-2.66c2.34-4.05 5.72-9.98 9.63-16.47 27.34-45.37 54.86-39.74 104.19-17.04l56.18 25.82a8.08 8.08 0 0 0 10.63-4.2l28.54-62.8a8.08 8.08 0 0 0-4.02-10.52c-14.35-6.64-42.87-19.74-63.48-29.22-76.87-35.33-142.87-32.93-203.03 52.96z"
      fill="url(#confluence-a)"
    />
    <path
      d="M246.74 58.64c3.69-6.08 7.79-13.1 10.54-17.87a8.08 8.08 0 0 0-2.87-11.02L196.44-5.39a8.08 8.08 0 0 0-11.06 2.66c-2.34 4.05-5.72 9.98-9.63 16.47C148.41 59.11 120.89 53.48 71.56 30.78L15.38 4.96a8.08 8.08 0 0 0-10.63 4.2L-23.79 72a8.08 8.08 0 0 0 4.02 10.52c14.35 6.64 42.87 19.74 63.48 29.22 76.87 35.33 142.87 32.93 203.03-53.1z"
      fill="url(#confluence-b)"
    />
  </svg>
);
