import type { NodeCategory } from "@openplane/types/canvas";

export const SHAPE_CLIP_PATHS: Record<NodeCategory, string> = {
  ai: "inset(0)",
  control: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  trigger: "circle(50% at 50% 50%)",
  human: "inset(0 round 12px)",
  integration: "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)",
  memory: "polygon(0% 10%, 50% 0%, 100% 10%, 100% 90%, 50% 100%, 0% 90%)",
  orchestration:
    "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  transform: "inset(0)",
};

export const SHAPE_SVG_PATHS: Record<NodeCategory, string> = {
  ai: "M 0 0 H 1 V 1 H 0 Z",
  control: "M 0.5 0 L 1 0.5 L 0.5 1 L 0 0.5 Z",
  trigger:
    "M 0.5 0 A 0.5 0.5 0 0 1 1 0.5 A 0.5 0.5 0 0 1 0.5 1 A 0.5 0.5 0 0 1 0 0.5 A 0.5 0.5 0 0 1 0.5 0 Z",
  human:
    "M 0.08 0 H 0.92 Q 1 0 1 0.08 V 0.92 Q 1 1 0.92 1 H 0.08 Q 0 1 0 0.92 V 0.08 Q 0 0 0.08 0 Z",
  integration: "M 0 0 L 0.85 0 L 1 0.5 L 0.85 1 L 0 1 Z",
  memory: "M 0 0.1 L 0.5 0 L 1 0.1 L 1 0.9 L 0.5 1 L 0 0.9 Z",
  orchestration: "M 0.25 0 L 0.75 0 L 1 0.5 L 0.75 1 L 0.25 1 L 0 0.5 Z",
  transform: "M 0 0 H 1 V 1 H 0 Z",
};

export function getShapeClipPath(category: NodeCategory): string {
  return SHAPE_CLIP_PATHS[category];
}

export function getShapeSvgPath(category: NodeCategory): string {
  return SHAPE_SVG_PATHS[category];
}
