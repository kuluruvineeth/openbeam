import type React from "react";

interface RevealMaskProps {
  shape: "circle" | "rectangle" | "diamond" | "horizontal" | "vertical";
  progress: number;
  originX?: number;
  originY?: number;
  children: React.ReactNode;
}

export const RevealMask: React.FC<RevealMaskProps> = ({
  shape,
  progress,
  originX = 0.5,
  originY = 0.5,
  children,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const clipPath = buildClipPath(shape, clamped, originX, originY);

  return <div style={{ clipPath, WebkitClipPath: clipPath }}>{children}</div>;
};

function buildClipPath(
  shape: RevealMaskProps["shape"],
  progress: number,
  originX: number,
  originY: number
): string {
  switch (shape) {
    case "circle": {
      const maxRadius = Math.sqrt(
        Math.max(originX, 1 - originX) ** 2 +
          Math.max(originY, 1 - originY) ** 2
      );
      const radius = progress * maxRadius * 100;
      return `circle(${radius}% at ${originX * 100}% ${originY * 100}%)`;
    }
    case "rectangle": {
      const inset = (1 - progress) * 50;
      return `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
    }
    case "diamond": {
      const half = progress * 50;
      const cx = originX * 100;
      const cy = originY * 100;
      return `polygon(${cx}% ${cy - half}%, ${cx + half}% ${cy}%, ${cx}% ${cy + half}%, ${cx - half}% ${cy}%)`;
    }
    case "horizontal": {
      const right = (1 - progress) * 100;
      return `inset(0 ${right}% 0 0)`;
    }
    case "vertical": {
      const bottom = (1 - progress) * 100;
      return `inset(0 0 ${bottom}% 0)`;
    }
    default:
      return "none";
  }
}
