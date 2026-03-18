import type { AnyNode, AnyNodeId } from "../../schema";
import type { CollectionId } from "../../schema/collections";
import type { SceneState } from "../use-scene";

type AnyContainerNode = AnyNode & { children: string[] };

export const createNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  ops: { node: AnyNode; parentId?: AnyNodeId }[]
) => {
  set((state) => {
    const nextNodes = { ...state.nodes };
    const nextRootIds = [...state.rootNodeIds];

    for (const { node, parentId } of ops) {
      const newNode = {
        ...node,
        parentId: parentId ?? null,
      };

      nextNodes[newNode.id] = newNode;

      if (parentId && nextNodes[parentId]) {
        const parent = nextNodes[parentId] as AnyNode;

        if ("children" in parent && Array.isArray(parent.children)) {
          nextNodes[parentId] = {
            ...(parent as AnyContainerNode),
            children: Array.from(
              new Set([...(parent as AnyContainerNode).children, newNode.id])
            ),
          } as AnyNode;
        }
      } else if (!(parentId || nextRootIds.includes(newNode.id))) {
        nextRootIds.push(newNode.id);
      }
    }

    return { nodes: nextNodes, rootNodeIds: nextRootIds };
  });

  for (const { node, parentId } of ops) {
    get().markDirty(node.id);
    if (parentId) {
      get().markDirty(parentId);
    }
  }
};

export const updateNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  updates: { id: AnyNodeId; data: Partial<AnyNode> }[]
) => {
  const parentsToUpdate = new Set<AnyNodeId>();

  set((state) => {
    const nextNodes = { ...state.nodes };

    for (const { id, data } of updates) {
      const currentNode = nextNodes[id];
      if (!currentNode) {
        continue;
      }

      if (
        data.parentId !== undefined &&
        data.parentId !== currentNode.parentId
      ) {
        const oldParentId = currentNode.parentId as AnyNodeId | null;
        if (oldParentId && nextNodes[oldParentId]) {
          const oldParent = nextNodes[oldParentId] as AnyContainerNode;
          nextNodes[oldParent.id] = {
            ...oldParent,
            children: oldParent.children.filter((childId) => childId !== id),
          } as AnyNode;
          parentsToUpdate.add(oldParent.id);
        }

        const newParentId = data.parentId as AnyNodeId | null;
        if (newParentId && nextNodes[newParentId]) {
          const newParent = nextNodes[newParentId] as AnyContainerNode;
          nextNodes[newParent.id] = {
            ...newParent,
            children: Array.from(new Set([...newParent.children, id])),
          } as AnyNode;
          parentsToUpdate.add(newParent.id);
        }
      }

      nextNodes[id] = { ...nextNodes[id], ...data } as AnyNode;
    }

    return { nodes: nextNodes };
  });

  requestAnimationFrame(() => {
    for (const u of updates) {
      get().markDirty(u.id);
    }
    for (const pId of parentsToUpdate) {
      get().markDirty(pId);
    }
  });
};

export const deleteNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  ids: AnyNodeId[]
) => {
  const parentsToMarkDirty = new Set<AnyNodeId>();

  set((state) => {
    const nextNodes = { ...state.nodes };
    const nextCollections = { ...state.collections };
    let nextRootIds = [...state.rootNodeIds];

    for (const id of ids) {
      const node = nextNodes[id];
      if (!node) {
        continue;
      }

      const parentId = node.parentId as AnyNodeId | null;
      if (parentId && nextNodes[parentId]) {
        const parent = nextNodes[parentId] as AnyContainerNode;
        if (parent.children) {
          nextNodes[parent.id] = {
            ...parent,
            children: parent.children.filter((cid) => cid !== id),
          } as AnyNode;
          parentsToMarkDirty.add(parent.id);
        }
      }

      nextRootIds = nextRootIds.filter((rid) => rid !== id);

      if ("collectionIds" in node && node.collectionIds) {
        for (const cid of node.collectionIds as CollectionId[]) {
          const col = nextCollections[cid];
          if (col) {
            nextCollections[cid] = {
              ...col,
              nodeIds: col.nodeIds.filter((nid) => nid !== id),
            };
          }
        }
      }

      delete (nextNodes as Record<string, AnyNode | undefined>)[id];

      if ("children" in node && node.children.length > 0) {
        get().deleteNodes(node.children as AnyNodeId[]);
      }
    }

    return {
      nodes: nextNodes,
      rootNodeIds: nextRootIds,
      collections: nextCollections,
    };
  });

  const currentNodes = get().nodes;
  for (const node of Object.values(currentNodes)) {
    get().markDirty(node.id);
  }
};
