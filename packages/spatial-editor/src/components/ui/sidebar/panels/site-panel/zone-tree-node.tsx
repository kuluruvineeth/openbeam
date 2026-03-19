import { useScene, type ZoneNode } from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useState } from "react";
import { ColorDot } from "./../../../../../components/ui/primitives/color-dot";
import { InlineRenameInput } from "./inline-rename-input";
import { TreeNodeWrapper } from "./tree-node";
import { TreeNodeActions } from "./tree-node-actions";

interface ZoneTreeNodeProps {
  node: ZoneNode;
  depth: number;
  isLast?: boolean;
}

export function ZoneTreeNode({ node, depth, isLast }: ZoneTreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateNode = useScene((state) => state.updateNode);
  const isSelected = useViewer((state) => state.selection.zoneId === node.id);
  const isHovered = useViewer((state) => state.hoveredId === node.id);
  const setSelection = useViewer((state) => state.setSelection);
  const setHoveredId = useViewer((state) => state.setHoveredId);

  const handleClick = () => {
    setSelection({ zoneId: node.id });
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleMouseEnter = () => {
    setHoveredId(node.id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  const area = calculatePolygonArea(node.polygon).toFixed(1);
  const defaultName = `Zone (${area}m²)`;

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={false}
      hasChildren={false}
      icon={
        <ColorDot
          color={node.color}
          onChange={(color) => updateNode(node.id, { color })}
        />
      }
      isHovered={isHovered}
      isLast={isLast}
      isSelected={isSelected}
      label={
        <InlineRenameInput
          defaultName={defaultName}
          isEditing={isEditing}
          node={node}
          onStartEditing={() => setIsEditing(true)}
          onStopEditing={() => setIsEditing(false)}
        />
      }
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onToggle={Function.prototype as () => void}
    />
  );
}

function calculatePolygonArea(polygon: [number, number][]): number {
  if (polygon.length < 3) {
    return 0;
  }

  let area = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = polygon[i] as [number, number];
    const pj = polygon[j] as [number, number];
    area += pi[0] * pj[1];
    area -= pj[0] * pi[1];
  }

  return Math.abs(area) / 2;
}
