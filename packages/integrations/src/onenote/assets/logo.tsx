/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 96 96"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M96 12v72c0 2.21-1.79 4-4 4H52V8h40c2.21 0 4 1.79 4 4z"
      fill="#ca64ea"
    />
    <path d="M52 8h24v80H52z" fill="#ae4bd5" />
    <path
      d="M92 0H40c-2.21 0-4 1.79-4 4v20h16V12h40v72H52V72H36v20c0 2.21 1.79 4 4 4h52c2.21 0 4-1.79 4-4V4c0-2.21-1.79-4-4-4z"
      fill="#7719aa"
    />
    <path
      d="M56 20H4c-2.21 0-4 1.79-4 4v48c0 2.21 1.79 4 4 4h52c2.21 0 4-1.79 4-4V24c0-2.21-1.79-4-4-4z"
      fill="#7719aa"
    />
    <path
      d="M17.2 36h6.1l12.5 19.3c.6.9 1 1.7 1.2 2.1h.1c-.1-1.2-.1-2.7-.1-4.4V36h5.3v28h-5.7L23.6 44.2l-1.1-1.8h-.1c.1 1.3.2 2.7.2 4.2V64H17.2V36z"
      fill="#fff"
    />
  </svg>
);
