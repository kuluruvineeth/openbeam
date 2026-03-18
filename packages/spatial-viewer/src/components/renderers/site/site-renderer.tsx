import { type SiteNode, useRegistry } from "@openbeam/spatial-core";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  type Group,
  Shape,
} from "three";
import { useNodeEvents } from "../../../hooks/use-node-events";
import { NodeRenderer } from "../node-renderer";

const Y_OFFSET = 0.01;

const createBoundaryLineGeometry = (
  points: [number, number][]
): BufferGeometry => {
  const geometry = new BufferGeometry();

  if (points.length < 2) {
    return geometry;
  }

  const positions: number[] = [];

  for (const [x, z] of points) {
    positions.push(x, Y_OFFSET, z);
  }
  const first = points[0];
  if (first) {
    positions.push(first[0], Y_OFFSET, first[1]);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

  return geometry;
};

export const SiteRenderer = ({ node }: { node: SiteNode }) => {
  const ref = useRef<Group>(null);

  useRegistry(node.id, "site", ref);

  const floorShape = useMemo(() => {
    if (!node?.polygon?.points || node.polygon.points.length < 3) {
      return null;
    }
    const shape = new Shape();
    const firstPt = node.polygon.points[0];
    if (!firstPt) {
      return null;
    }

    shape.moveTo(firstPt[0], -firstPt[1]);

    for (let i = 1; i < node.polygon.points.length; i += 1) {
      const pt = node.polygon.points[i];
      if (pt) {
        shape.lineTo(pt[0], -pt[1]);
      }
    }
    shape.closePath();

    return shape;
  }, [node?.polygon?.points]);

  const lineGeometry = useMemo(() => {
    if (!node?.polygon?.points || node.polygon.points.length < 2) {
      return null;
    }
    return createBoundaryLineGeometry(node.polygon.points);
  }, [node?.polygon?.points]);

  const handlers = useNodeEvents(node, "site");

  if (!(node && floorShape && lineGeometry)) {
    return null;
  }

  return (
    <group ref={ref} {...handlers}>
      {node.children.map((child) => (
        <NodeRenderer
          key={typeof child === "string" ? child : child.id}
          nodeId={typeof child === "string" ? child : child.id}
        />
      ))}

      <mesh
        position={[0, Y_OFFSET - 0.005, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shapeGeometry args={[floorShape]} />
        <shadowMaterial opacity={0.75} transparent />
      </mesh>

      {/* @ts-ignore */}
      <line frustumCulled={false} geometry={lineGeometry} renderOrder={9}>
        <lineBasicMaterial
          color="#f59e0b"
          linewidth={2}
          opacity={0.6}
          transparent
        />
      </line>
    </group>
  );
};
