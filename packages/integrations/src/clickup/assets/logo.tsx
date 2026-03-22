/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo component
  <svg
    className={className}
    height={size}
    viewBox="5.615 2.146 139.771 34.042"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="clickup-a"
        x1="5.615"
        x2="32.789"
        y1="31.179"
        y2="31.179"
      >
        <stop offset="0" stopColor="#8930fd" />
        <stop offset="1" stopColor="#49ccf9" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="clickup-b"
        x1="5.941"
        x2="31.978"
        y1="13.086"
        y2="13.086"
      >
        <stop offset="0" stopColor="#ff02f0" />
        <stop offset="1" stopColor="#ffc800" />
      </linearGradient>
    </defs>
    <path
      clipRule="evenodd"
      d="M5.615 27.26l5.015-3.851c2.664 3.485 5.494 5.092 8.645 5.092 3.134 0 5.884-1.588 8.428-5.046l5.086 3.758c-3.67 4.986-8.232 7.62-13.514 7.62-5.265 0-9.871-2.617-13.66-7.574z"
      fill="url(#clickup-a)"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M18.992 10.523l-8.925 7.71-4.126-4.797 13.07-11.29 12.967 11.299-4.145 4.78z"
      fill="url(#clickup-b)"
      fillRule="evenodd"
    />
  </svg>
);
