import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface GridRevealProps {
  columns?: number;
  rows?: number;
  startFrame: number;
  staggerFrames?: number;
  pattern?: "random" | "left-right" | "top-bottom" | "center-out" | "spiral";
  color?: string;
  children: React.ReactNode;
}

export const GridReveal: React.FC<GridRevealProps> = ({
  columns = 8,
  rows = 6,
  startFrame,
  staggerFrames = 1,
  pattern = "left-right",
  color = BRAND.bg,
  children,
}) => {
  const frame = useCurrentFrame();
  const _totalCells = columns * rows;
  const order = buildCellOrder(columns, rows, pattern);

  const elapsed = frame - startFrame;

  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {order.map((cellIndex, revealIndex) => {
          const col = cellIndex % columns;
          const row = Math.floor(cellIndex / columns);
          const revealFrame = revealIndex * staggerFrames;
          const visible = elapsed < revealFrame;

          if (!visible) {
            return null;
          }

          const cellWidth = 100 / columns;
          const cellHeight = 100 / rows;

          return (
            <div
              key={cellIndex}
              style={{
                position: "absolute",
                left: `${col * cellWidth}%`,
                top: `${row * cellHeight}%`,
                width: `${cellWidth}%`,
                height: `${cellHeight}%`,
                backgroundColor: color,
              }}
            />
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

function buildCellOrder(
  columns: number,
  rows: number,
  pattern: GridRevealProps["pattern"]
): number[] {
  const total = columns * rows;
  const indices = Array.from({ length: total }, (_, i) => i);

  switch (pattern) {
    case "left-right":
      return indices;

    case "top-bottom":
      return indices.sort((a, b) => {
        const rowA = Math.floor(a / columns);
        const rowB = Math.floor(b / columns);
        if (rowA !== rowB) {
          return rowA - rowB;
        }
        return (a % columns) - (b % columns);
      });

    case "center-out": {
      const cx = (columns - 1) / 2;
      const cy = (rows - 1) / 2;
      return indices.sort((a, b) => {
        const da = Math.hypot((a % columns) - cx, Math.floor(a / columns) - cy);
        const db = Math.hypot((b % columns) - cx, Math.floor(b / columns) - cy);
        return da - db;
      });
    }

    case "spiral":
      return buildSpiralOrder(columns, rows);

    case "random":
      return deterministicShuffle(indices);

    default:
      return indices;
  }
}

function buildSpiralOrder(columns: number, rows: number): number[] {
  const result: number[] = [];
  let top = 0;
  let bottom = rows - 1;
  let left = 0;
  let right = columns - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c += 1) {
      result.push(top * columns + c);
    }
    top += 1;
    for (let r = top; r <= bottom; r += 1) {
      result.push(r * columns + right);
    }
    right -= 1;
    if (top <= bottom) {
      for (let c = right; c >= left; c -= 1) {
        result.push(bottom * columns + c);
      }
      bottom -= 1;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r -= 1) {
        result.push(r * columns + left);
      }
      left += 1;
    }
  }

  return result;
}

function deterministicShuffle(arr: number[]): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const hash = Math.abs(Math.sin(i * 127.1 + 311.7) * 43_758.5453);
    const j = Math.floor((hash - Math.floor(hash)) * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
