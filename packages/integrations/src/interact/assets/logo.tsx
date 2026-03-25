/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      fill="none"
      height={size}
      viewBox="0 0 60 60"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="int_a"
          x1="0"
          x2="5987.63"
          y1="3295.48"
          y2="-2637.22"
        >
          <stop stopColor="#10B5E8" />
          <stop offset="1" stopColor="#8B00FF" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="int_b"
          x1="-1024.83"
          x2="4931.96"
          y1="5957.02"
          y2="-.013"
        >
          <stop stopColor="#10B5E8" />
          <stop offset="1" stopColor="#8B00FF" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="int_c"
          x1="-3558.75"
          x2="2262.72"
          y1="4617.44"
          y2="-1384.58"
        >
          <stop stopColor="#10B5E8" />
          <stop offset="1" stopColor="#8B00FF" />
        </linearGradient>
      </defs>
      <path
        d="M4.095 30.98h24.748v24.747H4.095V30.979zM0 26.883V60h33.116V26.884H0z"
        fill="url(#int_a)"
      />
      <path
        d="M14.6 4.273h14.243v14.243H14.599V4.273zM10.325 0v22.611h22.612V0H10.326z"
        fill="url(#int_b)"
      />
      <path
        d="M41.306 17.804h13.887v13.888H41.306V17.803zm-4.095-4.273v22.255h22.255V13.531H37.211z"
        fill="url(#int_c)"
      />
    </svg>
  );
}
