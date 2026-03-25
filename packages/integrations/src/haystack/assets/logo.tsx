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
      <rect fill="#e8590c" height="32" rx="6" width="32" />
      <path d="M8 8h3.5v6.4h9V8H24v16h-3.5v-6.4h-9V24H8V8z" fill="#ffffff" />
    </svg>
  );
}
