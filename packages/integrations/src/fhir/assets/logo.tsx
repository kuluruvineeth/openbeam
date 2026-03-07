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
    <path
      d="M24 4c-2 4-8 10-8 18 0 6.627 3.582 12 8 12s8-5.373 8-12c0-8-6-14-8-18Z"
      fill="#E35205"
    />
    <path
      d="M24 8c-1.5 3-5.5 7.5-5.5 14 0 4.97 2.462 9 5.5 9s5.5-4.03 5.5-9c0-6.5-4-11-5.5-14Z"
      fill="#F49800"
    />
    <path
      d="M24 13c-1 2-3.5 5-3.5 9 0 3.314 1.567 6 3.5 6s3.5-2.686 3.5-6c0-4-2.5-7-3.5-9Z"
      fill="#FFE100"
    />
    <text
      dominantBaseline="central"
      fill="#E35205"
      fontFamily="Arial, sans-serif"
      fontSize="7"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="42"
    >
      FHIR
    </text>
  </svg>
);
