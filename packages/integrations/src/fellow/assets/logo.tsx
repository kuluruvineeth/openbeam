/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#ff925c" height="32" rx="6" width="32" />
      <path d="M9 8h14v3.2H12.6v3.6h8.8v3.2h-8.8v6H9V8z" fill="#ffffff" />
    </svg>
  );
}
