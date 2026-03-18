import { type RoofNode, useRegistry } from "@openbeam/spatial-core";
import { useRef } from "react";
import type { Mesh } from "three";
import { useNodeEvents } from "../../../hooks/use-node-events";

export const RoofRenderer = ({ node }: { node: RoofNode }) => {
  const ref = useRef<Mesh>(null);

  useRegistry(node.id, "roof", ref);

  const handlers = useNodeEvents(node, "roof");

  return (
    <mesh
      castShadow
      position={node.position}
      receiveShadow
      ref={ref}
      rotation-y={node.rotation}
      visible={node.visible}
      {...handlers}
    >
      <boxGeometry args={[0, 0, 0]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
};
