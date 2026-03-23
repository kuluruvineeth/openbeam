/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 512 512"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M392.93 494.14H140.87c-12.04 0-21.8-9.76-21.8-21.8V39.66c0-12.04 9.76-21.8 21.8-21.8H490.2c12.04 0 21.8 9.76 21.8 21.8v97.27L392.93 494.14z"
        fill="#CA64EA"
      />
      <path
        d="M512 256l-59.53 35.72L392.93 256V136.93H512V256z"
        fill="#AE4BD5"
      />
      <path
        d="M512 375.07l-59.53 35.72-59.53-35.72V256H512v119.07z"
        fill="#9332BF"
      />
      <path
        d="M392.93 375.07H512v96.74c0 12.33-10 22.33-22.33 22.33h-96.74V375.07z"
        fill="#7719AA"
      />
      <path
        d="M263.94 113.12H119.07v297.67h144.87c12.04-.04 21.79-9.79 21.83-21.83V134.94c-.04-12.04-9.79-21.78-21.83-21.82z"
        opacity="0.2"
      />
      <path
        d="M252.03 125.02H119.07v273.86h132.97c12.04-.04 21.79-9.79 21.83-21.83V146.85c-.05-12.04-9.8-21.79-21.84-21.83z"
        opacity="0.5"
      />
      <path
        d="M240.13 125.02H119.07v273.86h121.06c12.04-.04 21.79-9.79 21.83-21.83V146.85c-.05-12.04-9.8-21.79-21.83-21.83z"
        opacity="0.5"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="on_grad"
          x1="45.507"
          x2="216.447"
          y1="107.97"
          y2="404.03"
        >
          <stop offset="0" stopColor="#8324B3" />
          <stop offset="0.5" stopColor="#7A1BAC" />
          <stop offset="1" stopColor="#621197" />
        </linearGradient>
      </defs>
      <path
        d="M21.83 125.02h218.3c12.05 0 21.83 9.77 21.83 21.83v218.3c0 12.05-9.77 21.83-21.83 21.83H21.83C9.77 386.98 0 377.21 0 365.15v-218.3c0-12.05 9.77-21.83 21.83-21.83z"
        fill="url(#on_grad)"
      />
      <path
        d="M71.75 185.06h29.59l58.14 94.07c2.64 4.22 4.63 7.61 5.95 10.18h.38c-.72-6.4-1.01-12.85-.86-19.29v-84.96h25.24v141.88h-27.7l-60.32-96.67a97.3 97.3 0 0 1-5.38-9.99h-.48c.61 7.04.86 14.11.75 21.17v85.49H71.75V185.06z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
