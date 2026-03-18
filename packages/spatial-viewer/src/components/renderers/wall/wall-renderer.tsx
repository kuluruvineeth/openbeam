import { useRegistry, type WallNode } from "@openbeam/spatial-core";
import { useRef } from "react";
import type { Mesh } from "three";
import { useNodeEvents } from "../../../hooks/use-node-events";
import { NodeRenderer } from "../node-renderer";

export const WallRenderer = ({ node }: { node: WallNode }) => {
  const ref = useRef<Mesh>(null);

  useRegistry(node.id, "wall", ref);

  const handlers = useNodeEvents(node, "wall");

  return (
    <mesh castShadow receiveShadow ref={ref} visible={node.visible}>
      <boxGeometry args={[0, 0, 0]} />
      <mesh name="collision-mesh" visible={false} {...handlers}>
        <boxGeometry args={[0, 0, 0]} />
      </mesh>

      {node.children.map((childId) => (
        <NodeRenderer key={childId} nodeId={childId} />
      ))}
    </mesh>
  );
};
