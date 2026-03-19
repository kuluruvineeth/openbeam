import {
  type AnyNodeId,
  type CeilingNode,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import Image from "next/image";
import { useEffect, useState } from "react";
import useEditor from "./../../../../../store/use-editor";
import { InlineRenameInput } from "./inline-rename-input";
import { handleTreeSelection, TreeNode, TreeNodeWrapper } from "./tree-node";
import { TreeNodeActions } from "./tree-node-actions";

interface CeilingTreeNodeProps {
  node: CeilingNode;
  depth: number;
  isLast?: boolean;
}

export function CeilingTreeNode({ node, depth, isLast }: CeilingTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const selectedIds = useViewer((state) => state.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const isHovered = useViewer((state) => state.hoveredId === node.id);
  const setSelection = useViewer((state) => state.setSelection);
  const setHoveredId = useViewer((state) => state.setHoveredId);

  useEffect(() => {
    if (selectedIds.length === 0) {
      return;
    }
    const nodes = useScene.getState().nodes;
    let isDescendant = false;
    for (const id of selectedIds) {
      let current = nodes[id as AnyNodeId];
      while (current?.parentId) {
        if (current.parentId === node.id) {
          isDescendant = true;
          break;
        }
        current = nodes[current.parentId as AnyNodeId];
      }
      if (isDescendant) {
        break;
      }
    }
    if (isDescendant) {
      setExpanded(true);
    }
  }, [selectedIds, node.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const handled = handleTreeSelection(e, node.id, selectedIds, setSelection);
    if (!handled && useEditor.getState().phase === "furnish") {
      useEditor.getState().setPhase("structure");
    }
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
  const defaultName = `Ceiling (${area}m²)`;

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={expanded}
      hasChildren={node.children.length > 0}
      icon={
        <Image
          alt=""
          className="object-contain"
          height={14}
          src="/icons/ceiling.png"
          width={14}
        />
      }
      isHovered={isHovered}
      isLast={isLast}
      isSelected={isSelected}
      isVisible={node.visible !== false}
      label={
        <InlineRenameInput
          defaultName={defaultName}
          isEditing={isEditing}
          node={node}
          onStartEditing={() => setIsEditing(true)}
          onStopEditing={() => setIsEditing(false)}
        />
      }
      nodeId={node.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onToggle={() => setExpanded(!expanded)}
    >
      {node.children.map((childId, index) => (
        <TreeNode
          depth={depth + 1}
          isLast={index === node.children.length - 1}
          key={childId}
          nodeId={childId}
        />
      ))}
    </TreeNodeWrapper>
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
