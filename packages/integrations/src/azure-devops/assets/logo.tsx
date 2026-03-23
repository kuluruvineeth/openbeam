/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 16 16"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 3.622v8.512L11.5 15l-5.425-1.975v1.958L3.004 10.97l8.951.7V4.005L15 3.622zm-2.984.428L6.994 1v2.001L2.382 4.356 1 6.13v4.029l1.978.873V5.869l9.038-1.818z"
      fill="url(#ado-gradient)"
    />
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="ado-gradient"
        x1="8"
        x2="8"
        y1="14.956"
        y2="1.026"
      >
        <stop stopColor="#0078D4" />
        <stop offset=".16" stopColor="#1380DA" />
        <stop offset=".53" stopColor="#3C91E5" />
        <stop offset=".82" stopColor="#559CEC" />
        <stop offset="1" stopColor="#5EA0EF" />
      </linearGradient>
    </defs>
  </svg>
);
