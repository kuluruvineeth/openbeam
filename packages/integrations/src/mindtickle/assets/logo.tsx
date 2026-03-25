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
      <rect fill="#FE5000" height="100" rx="16" width="100" />
      <path
        d="M22 72V42c0-5.5 4-10 9.5-10S41 36.5 41 42v30h10V42c0-5.5 4-10 9.5-10S70 36.5 70 42v30h8V40c0-10-8-18-18-18-5.5 0-10.5 2.5-14 6.5C42.5 24.5 37.5 22 32 22c-10 0-18 8-18 18v32h8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
