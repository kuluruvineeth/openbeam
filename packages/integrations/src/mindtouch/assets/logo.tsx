/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="22" cy="22" fill="#4A9FD9" r="6" />
      <circle cx="46" cy="22" fill="#4A9FD9" r="6" />
      <path
        d="M12 38c0 14 40 14 40 0"
        fill="none"
        stroke="#4A9FD9"
        strokeLinecap="round"
        strokeWidth="7"
      />
    </svg>
  );
}
