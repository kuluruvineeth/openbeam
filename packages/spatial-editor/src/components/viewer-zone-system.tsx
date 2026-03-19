"use client";

import { sceneRegistry, useScene, type ZoneNode } from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useFrame } from "@react-three/fiber";

export const ViewerZoneSystem = () => {
  useFrame(() => {
    const { levelId, zoneId } = useViewer.getState().selection;
    const nodes = useScene.getState().nodes;

    for (const id of sceneRegistry.byType.zone) {
      const obj = sceneRegistry.nodes.get(id);
      if (!obj) {
        continue;
      }

      const zone = nodes[id as ZoneNode["id"]] as ZoneNode | undefined;
      if (!zone) {
        continue;
      }

      const isOnSelectedLevel = zone.parentId === levelId;
      const shouldShow = !!levelId && isOnSelectedLevel && !zoneId;

      obj.visible = shouldShow;

      const targetOpacity = shouldShow ? "1" : "0";
      const labelEl = document.getElementById(`${id}-label`);
      if (labelEl && labelEl.style.opacity !== targetOpacity) {
        labelEl.style.opacity = targetOpacity;
      }
    }
  });

  return null;
};
