import { type SiteNode, useScene } from "@openbeam/spatial-core";
import { useCallback } from "react";
import { PolygonEditor } from "../shared/polygon-editor";

export const SiteBoundaryEditor: React.FC = () => {
  const nodes = useScene((state) => state.nodes);
  const rootNodeIds = useScene((state) => state.rootNodeIds);
  const updateNode = useScene((state) => state.updateNode);

  const siteNode = rootNodeIds[0] ? nodes[rootNodeIds[0]] : null;
  const site = siteNode?.type === "site" ? (siteNode as SiteNode) : null;

  const handlePolygonChange = useCallback(
    (newPolygon: [number, number][]) => {
      if (site) {
        updateNode(site.id, {
          polygon: {
            type: "polygon",
            points: newPolygon,
          },
        });
      }
    },
    [site, updateNode]
  );

  if (!site?.polygon?.points || site.polygon.points.length < 3) {
    return null;
  }

  return (
    <PolygonEditor
      color="#10b981"
      minVertices={3}
      onPolygonChange={handlePolygonChange}
      polygon={site.polygon.points}
    />
  );
};
