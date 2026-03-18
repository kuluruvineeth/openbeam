import { useLayoutEffect } from "react";
import type * as THREE from "three";

export const sceneRegistry = {
  nodes: new Map<string, THREE.Object3D>(),

  byType: {
    site: new Set<string>(),
    building: new Set<string>(),
    ceiling: new Set<string>(),
    level: new Set<string>(),
    wall: new Set<string>(),
    item: new Set<string>(),
    slab: new Set<string>(),
    zone: new Set<string>(),
    roof: new Set<string>(),
    scan: new Set<string>(),
    guide: new Set<string>(),
    window: new Set<string>(),
    door: new Set<string>(),
  },
};

export function useRegistry(
  id: string,
  type: keyof typeof sceneRegistry.byType,
  ref: React.RefObject<THREE.Object3D | null>
) {
  useLayoutEffect(() => {
    const obj = ref.current;
    if (!obj) {
      return;
    }

    sceneRegistry.nodes.set(id, obj);
    sceneRegistry.byType[type].add(id);

    return () => {
      sceneRegistry.nodes.delete(id);
      sceneRegistry.byType[type].delete(id);
    };
  }, [id, type, ref]);
}
