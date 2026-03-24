/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#1B1F3B" height="64" rx="12" width="64" />
    <path
      d="M32 12C31.2 12 30.5 12.5 30.2 13.3L18.4 44.2C18 45.2 18.7 46.3 19.8 46.3H23.6C24.4 46.3 25.1 45.8 25.4 45L28.2 37.7H35.8L38.6 45C38.9 45.8 39.6 46.3 40.4 46.3H44.2C45.3 46.3 46 45.2 45.6 44.2L33.8 13.3C33.5 12.5 32.8 12 32 12ZM30.4 31.7L32 27.1L33.6 31.7H30.4Z"
      fill="url(#amp_grad)"
    />
    <path
      d="M11.5 38.8C10.7 38.8 10 39.5 10 40.3V44.8C10 45.6 10.7 46.3 11.5 46.3H14.5C15.3 46.3 16 45.6 16 44.8V40.3C16 39.5 15.3 38.8 14.5 38.8H11.5Z"
      fill="url(#amp_grad)"
    />
    <path
      d="M49.5 38.8C48.7 38.8 48 39.5 48 40.3V44.8C48 45.6 48.7 46.3 49.5 46.3H52.5C53.3 46.3 54 45.6 54 44.8V40.3C54 39.5 53.3 38.8 52.5 38.8H49.5Z"
      fill="url(#amp_grad)"
    />
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="amp_grad"
        x1="10"
        x2="54"
        y1="12"
        y2="46.3"
      >
        <stop stopColor="#36B4F5" />
        <stop offset="1" stopColor="#1B74E4" />
      </linearGradient>
    </defs>
  </svg>
);
