import { useScene } from "@openbeam/spatial-core";
import polygonClipping from "polygon-clipping";
import { useMemo } from "react";
import * as THREE from "three";
import useViewer from "../../store/use-viewer";

export const GroundOccluder = () => {
  const theme = useViewer((state) => state.theme);
  const bgColor = theme === "dark" ? "#1f2433" : "#fafafa";

  const nodes = useScene((state) => state.nodes);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const size = 1000;
    s.moveTo(-size, -size);
    s.lineTo(size, -size);
    s.lineTo(size, size);
    s.lineTo(-size, size);
    s.closePath();

    const polygons: [number, number][][] = [];

    for (const node of Object.values(nodes)) {
      if (node.type === "slab" && node.polygon && node.polygon.length >= 3) {
        polygons.push(node.polygon as [number, number][]);
      }
    }

    if (polygons.length > 0) {
      const multiPolygons = polygons.map((pts) => {
        const ring = pts.map((p) => [p[0], -p[1]] as [number, number]);
        return [ring];
      });

      const firstPoly = multiPolygons[0];
      if (!firstPoly) {
        return s;
      }
      const unionedPolygons = polygonClipping.union(
        firstPoly,
        ...multiPolygons.slice(1)
      );

      for (const geom of unionedPolygons) {
        if (geom.length > 0) {
          const ring = geom[0];
          if (!ring) {
            continue;
          }
          const hole = new THREE.Path();

          if (ring.length > 0) {
            hole.moveTo(ring[0]?.[0] ?? 0, ring[0]?.[1] ?? 0);
            for (let i = 1; i < ring.length; i += 1) {
              hole.lineTo(ring[i]?.[0] ?? 0, ring[i]?.[1] ?? 0);
            }
            hole.closePath();
            s.holes.push(hole);
          }
        }
      }
    }

    return s;
  }, [nodes]);

  return (
    <mesh position-y={-0.05} rotation-x={-Math.PI / 2}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial
        color={bgColor}
        depthWrite={true}
        polygonOffset={true}
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
};
