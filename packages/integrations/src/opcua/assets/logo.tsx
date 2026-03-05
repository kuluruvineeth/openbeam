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
    <rect fill="#2C5591" height="40" rx="4" width="40" x="4" y="4" />
    <text
      dominantBaseline="central"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      fontSize="12"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="19"
    >
      OPC
    </text>
    <text
      dominantBaseline="central"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      fontSize="11"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="33"
    >
      UA
    </text>
  </svg>
);
