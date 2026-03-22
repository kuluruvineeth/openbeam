/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 380 380"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M190.443 357.586L253.29 164.234H127.596L190.443 357.586Z"
      fill="#E24329"
    />
    <path
      d="M190.443 357.586L127.596 164.234H18.523L190.443 357.586Z"
      fill="#FC6D26"
    />
    <path
      d="M18.523 164.234L2.203 214.445C0.774 219.84 2.69 225.613 7.226 228.91L190.443 357.586L18.523 164.234Z"
      fill="#FCA326"
    />
    <path
      d="M18.523 164.234H127.596L80.985 20.819C79.336 15.856 72.334 15.856 70.685 20.819L18.523 164.234Z"
      fill="#E24329"
    />
    <path
      d="M190.443 357.586L253.29 164.234H362.363L190.443 357.586Z"
      fill="#FC6D26"
    />
    <path
      d="M362.363 164.234L378.683 214.445C380.112 219.84 378.196 225.613 373.66 228.91L190.443 357.586L362.363 164.234Z"
      fill="#FCA326"
    />
    <path
      d="M362.363 164.234H253.29L299.901 20.819C301.55 15.856 308.552 15.856 310.201 20.819L362.363 164.234Z"
      fill="#E24329"
    />
  </svg>
);
