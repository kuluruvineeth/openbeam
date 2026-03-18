type WallSide = "front" | "back";
type AttachType = "wall" | "wall-side";

const EPSILON = 0.001;
const AUTO_SNAP_MARGIN = 0.05;

interface WallItemPlacement {
  itemId: string;
  wallId: string;
  tStart: number;
  tEnd: number;
  yStart: number;
  yEnd: number;
  attachType?: AttachType;
  side?: WallSide;
}

function autoAdjustYPosition(
  yBottom: number,
  itemHeight: number,
  wallHeight: number
): { adjustedY: number; wasAdjusted: boolean } {
  const yTop = yBottom + itemHeight;

  if (yBottom >= 0 && yTop <= wallHeight) {
    return { adjustedY: yBottom, wasAdjusted: false };
  }

  if (yTop > wallHeight) {
    const adjustedY = wallHeight - itemHeight - AUTO_SNAP_MARGIN;
    return { adjustedY: Math.max(0, adjustedY), wasAdjusted: true };
  }

  if (yBottom < 0) {
    return { adjustedY: AUTO_SNAP_MARGIN, wasAdjusted: true };
  }

  return { adjustedY: yBottom, wasAdjusted: false };
}

export class WallSpatialGrid {
  private readonly wallItems = new Map<string, WallItemPlacement[]>();
  private readonly itemToWall = new Map<string, string>();

  canPlaceOnWall(options: {
    wallId: string;
    wallLength: number;
    wallHeight: number;
    tCenter: number;
    itemWidth: number;
    yBottom: number;
    itemHeight: number;
    attachType?: AttachType;
    side?: WallSide;
    ignoreIds?: string[];
  }): {
    valid: boolean;
    conflictIds: string[];
    adjustedY: number;
    wasAdjusted: boolean;
  } {
    const {
      wallId,
      wallLength,
      wallHeight,
      tCenter,
      itemWidth,
      yBottom,
      itemHeight,
      attachType = "wall",
      side,
      ignoreIds = [],
    } = options;
    const halfW = itemWidth / wallLength / 2;
    const tStart = tCenter - halfW;
    const tEnd = tCenter + halfW;

    if (tStart < 0 || tEnd > 1) {
      return {
        valid: false,
        conflictIds: [],
        adjustedY: yBottom,
        wasAdjusted: false,
      };
    }

    const { adjustedY, wasAdjusted } = autoAdjustYPosition(
      yBottom,
      itemHeight,
      wallHeight
    );
    const yStart = adjustedY;
    const yEnd = adjustedY + itemHeight;

    const existing = this.wallItems.get(wallId) ?? [];
    const ignoreSet = new Set(ignoreIds);
    const conflicts: string[] = [];

    for (const placement of existing) {
      if (ignoreSet.has(placement.itemId)) {
        continue;
      }

      const tOverlap =
        tStart < placement.tEnd - EPSILON && tEnd > placement.tStart + EPSILON;
      const yOverlap =
        yStart < placement.yEnd - EPSILON && yEnd > placement.yStart + EPSILON;

      if (tOverlap && yOverlap) {
        const hasConflict = this.checkSideConflict(attachType, side, placement);
        if (hasConflict) {
          conflicts.push(placement.itemId);
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflictIds: conflicts,
      adjustedY,
      wasAdjusted,
    };
  }

  private checkSideConflict(
    newAttachType: AttachType,
    newSide: WallSide | undefined,
    existing: WallItemPlacement
  ): boolean {
    const existingAttachType = existing.attachType ?? "wall";

    if (newAttachType === "wall") {
      return true;
    }

    if (existingAttachType === "wall") {
      return true;
    }

    if (!(newSide && existing.side)) {
      return true;
    }
    return newSide === existing.side;
  }

  insert(placement: WallItemPlacement) {
    const { wallId, itemId } = placement;

    if (!this.wallItems.has(wallId)) {
      this.wallItems.set(wallId, []);
    }
    this.wallItems.get(wallId)?.push(placement);
    this.itemToWall.set(itemId, wallId);
  }

  remove(wallId: string, itemId: string) {
    const items = this.wallItems.get(wallId);
    if (items) {
      const idx = items.findIndex((p) => p.itemId === itemId);
      if (idx !== -1) {
        items.splice(idx, 1);
      }
    }
    this.itemToWall.delete(itemId);
  }

  removeByItemId(itemId: string) {
    const wallId = this.itemToWall.get(itemId);
    if (wallId) {
      this.remove(wallId, itemId);
    }
  }

  removeWall(wallId: string): string[] {
    const items = this.wallItems.get(wallId) ?? [];
    const removedIds = items.map((p) => p.itemId);

    for (const itemId of removedIds) {
      this.itemToWall.delete(itemId);
    }
    this.wallItems.delete(wallId);

    return removedIds;
  }

  getWallForItem(itemId: string): string | undefined {
    return this.itemToWall.get(itemId);
  }

  clear() {
    this.wallItems.clear();
    this.itemToWall.clear();
  }
}
