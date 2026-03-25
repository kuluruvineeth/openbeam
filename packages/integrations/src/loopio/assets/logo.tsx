/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#03D4CC" height="100" rx="16" width="100" />
      <path d="M25 22h12v40h20v10H25V22z" fill="#FFFFFF" />
      <circle
        cx="68"
        cy="55"
        fill="none"
        r="12"
        stroke="#FFFFFF"
        strokeWidth="8"
      />
    </svg>
  );
}
