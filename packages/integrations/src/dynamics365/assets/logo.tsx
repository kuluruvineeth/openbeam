/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 76.382 122.879"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M0 39.482v83.397l76.382-41.457V43.468L3.241 118.893l21.392-63.438L0 39.482zM0 33.998V0l73.65 39.986L48.845 57.814 0 33.998z"
        fill="#18264E"
        fillRule="evenodd"
      />
    </svg>
  );
}
