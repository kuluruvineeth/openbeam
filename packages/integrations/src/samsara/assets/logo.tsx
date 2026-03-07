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
      d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4Zm0 3c9.389 0 17 7.611 17 17s-7.611 17-17 17S7 33.389 7 24 14.611 7 24 7Z"
      fill="#00263E"
    />
    <path
      d="M24 14c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10Zm-3 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm6 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM18 28c0-1 2.686-3 6-3s6 2 6 3-2.686 2-6 2-6-1-6-2Z"
      fill="#00263E"
    />
    <path
      d="M15 12.5 12 8M33 12.5 36 8"
      stroke="#00263E"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
  </svg>
);
