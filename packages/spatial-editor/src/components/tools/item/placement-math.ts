import { isObject } from "@openbeam/spatial-core";

export function snapToGrid(position: number, dimension: number): number {
  const halfDim = dimension / 2;
  const needsOffset = Math.abs(((halfDim * 2) % 1) - 0.5) < 0.01;
  const offset = needsOffset ? 0.25 : 0;
  return Math.round((position - offset) * 2) / 2 + offset;
}

export function snapToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function calculateCursorRotation(
  normal: [number, number, number] | undefined,
  wallStart: [number, number],
  wallEnd: [number, number]
): number {
  if (!normal) {
    return 0;
  }

  const wallAngle = Math.atan2(
    wallEnd[1] - wallStart[1],
    wallEnd[0] - wallStart[0]
  );

  if (normal[2] < 0) {
    return -wallAngle;
  }
  return Math.PI - wallAngle;
}

export function calculateItemRotation(
  normal: [number, number, number] | undefined
): number {
  if (!normal) {
    return 0;
  }

  return normal[2] > 0 ? 0 : Math.PI;
}

export function getSideFromNormal(
  normal: [number, number, number] | undefined
): "front" | "back" {
  if (!normal) {
    return "front";
  }
  return normal[2] >= 0 ? "front" : "back";
}

export function isValidWallSideFace(
  normal: [number, number, number] | undefined
): boolean {
  if (!normal) {
    return false;
  }
  return Math.abs(normal[2]) > 0.7;
}

// biome-ignore lint/suspicious/noExplicitAny: type cast
export function stripTransient(meta: any): any {
  if (!isObject(meta)) {
    return meta;
  }
  // biome-ignore lint/suspicious/noExplicitAny: type cast
  // biome-ignore lint/correctness/noUnusedVariables: acceptable
  const { isTransient, ...rest } = meta as Record<string, any>;
  return rest;
}
