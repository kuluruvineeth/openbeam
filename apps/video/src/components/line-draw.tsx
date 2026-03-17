import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface LineDrawProps {
  d: string;
  startFrame: number;
  durationFrames?: number;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  viewBox?: string;
}

const SPLIT_NUMS_REGEX = /[\s,]+/;

function estimatePathLength(d: string): number {
  const commands = d.match(/[A-Za-z][^A-Za-z]*/g) || [];
  let length = 0;
  let cx = 0;
  let cy = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const nums = cmd.slice(1).trim().split(SPLIT_NUMS_REGEX).map(Number);

    if (type === "M" || type === "m") {
      cx = type === "M" ? nums[0] : cx + nums[0];
      cy = type === "M" ? nums[1] : cy + nums[1];
    } else if (type === "L" || type === "l") {
      const nx = type === "L" ? nums[0] : cx + nums[0];
      const ny = type === "L" ? nums[1] : cy + nums[1];
      length += Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
      cx = nx;
      cy = ny;
    } else if (type === "H" || type === "h") {
      const nx = type === "H" ? nums[0] : cx + nums[0];
      length += Math.abs(nx - cx);
      cx = nx;
    } else if (type === "V" || type === "v") {
      const ny = type === "V" ? nums[0] : cy + nums[0];
      length += Math.abs(ny - cy);
      cy = ny;
    } else if (type === "C" || type === "c") {
      const ex = type === "C" ? nums[4] : cx + nums[4];
      const ey = type === "C" ? nums[5] : cy + nums[5];
      length += Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2) * 1.5;
      cx = ex;
      cy = ey;
    } else if (type === "Q" || type === "q") {
      const ex = type === "Q" ? nums[2] : cx + nums[2];
      const ey = type === "Q" ? nums[3] : cy + nums[3];
      length += Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2) * 1.3;
      cx = ex;
      cy = ey;
    } else if (type === "Z" || type === "z") {
      length += 50;
    } else {
      length += 100;
    }
  }

  return Math.max(length, 100);
}

export const LineDraw: React.FC<LineDrawProps> = ({
  d,
  startFrame,
  durationFrames = 40,
  stroke = BRAND.fg,
  strokeWidth = 2,
  width = 400,
  height = 400,
  viewBox = "0 0 400 400",
}) => {
  const frame = useCurrentFrame();
  const pathLength = estimatePathLength(d);

  const drawProgress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  const dashOffset = pathLength * (1 - drawProgress);

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      height={height}
      style={{ overflow: "visible" }}
      viewBox={viewBox}
      width={width}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
