import {
  type AnyNodeId,
  type AssetInput,
  ItemNode,
  sceneRegistry,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useCallback, useMemo, useRef } from "react";
import type { Vector3 } from "three";
import { stripTransient } from "./placement-math";

interface OriginalState {
  position: [number, number, number];
  rotation: [number, number, number];
  side: ItemNode["side"];
  parentId: string | null;
  metadata: ItemNode["metadata"];
}

export interface DraftNodeHandle {
  readonly current: ItemNode | null;
  readonly isAdopted: boolean;
  create: (
    gridPosition: Vector3,
    asset: AssetInput,
    rotation?: [number, number, number],
    scale?: [number, number, number]
  ) => ItemNode | null;
  adopt: (node: ItemNode) => void;
  commit: (finalUpdate: Partial<ItemNode>) => string | null;
  destroy: () => void;
}

export function useDraftNode(): DraftNodeHandle {
  const draftRef = useRef<ItemNode | null>(null);
  const adoptedRef = useRef(false);
  const originalStateRef = useRef<OriginalState | null>(null);

  const create = useCallback(
    (
      gridPosition: Vector3,
      asset: AssetInput,
      rotation?: [number, number, number],
      scale?: [number, number, number]
    ): ItemNode | null => {
      const currentLevelId = useViewer.getState().selection.levelId;
      if (!currentLevelId) {
        return null;
      }

      const node = ItemNode.parse({
        position: [gridPosition.x, gridPosition.y, gridPosition.z],
        rotation: rotation ?? [0, 0, 0],
        scale: scale ?? [1, 1, 1],
        name: asset.name,
        asset,
        parentId: currentLevelId,
        metadata: { isTransient: true },
      });

      useScene.getState().createNode(node, currentLevelId);
      draftRef.current = node;
      adoptedRef.current = false;
      originalStateRef.current = null;
      return node;
    },
    []
  );

  const adopt = useCallback((node: ItemNode): void => {
    const meta =
      typeof node.metadata === "object" &&
      node.metadata !== null &&
      !Array.isArray(node.metadata)
        ? (node.metadata as Record<string, unknown>)
        : {};

    originalStateRef.current = {
      position: [...node.position] as [number, number, number],
      rotation: [...node.rotation] as [number, number, number],
      side: node.side,
      parentId: node.parentId,
      metadata: node.metadata,
    };

    draftRef.current = node;
    adoptedRef.current = true;

    useScene.getState().updateNode(node.id, {
      metadata: { ...meta, isTransient: true },
    });
  }, []);

  const commit = useCallback(
    (finalUpdate: Partial<ItemNode>): string | null => {
      const draft = draftRef.current;
      if (!draft) {
        return null;
      }

      if (adoptedRef.current) {
        // biome-ignore lint/nursery/noShadow: destructured rename
        const { parentId: newParentId, ...updateProps } = finalUpdate;
        const parentId =
          newParentId ??
          originalStateRef.current?.parentId ??
          useViewer.getState().selection.levelId;
        // biome-ignore lint/style/noNonNullAssertion: geometry access
        const original = originalStateRef.current!;

        useScene.getState().updateNode(draft.id, {
          position: original.position,
          rotation: original.rotation,
          side: original.side,
          parentId: original.parentId,
          metadata: original.metadata,
        });

        useScene.temporal.getState().resume();

        useScene.getState().updateNode(draft.id, {
          position: updateProps.position ?? draft.position,
          rotation: updateProps.rotation ?? draft.rotation,
          side: updateProps.side ?? draft.side,
          metadata: updateProps.metadata ?? stripTransient(draft.metadata),
          parentId: parentId as string,
        });

        useScene.temporal.getState().pause();

        const id = draft.id;
        draftRef.current = null;
        adoptedRef.current = false;
        originalStateRef.current = null;
        return id;
      }

      const { parentId: newParentId, ...updateProps } = finalUpdate;
      const parentId = (newParentId ??
        useViewer.getState().selection.levelId) as AnyNodeId;
      if (!parentId) {
        return null;
      }

      useScene.getState().deleteNode(draft.id);
      draftRef.current = null;

      useScene.temporal.getState().resume();

      const finalNode = ItemNode.parse({
        name: draft.name,
        asset: draft.asset,
        position: updateProps.position ?? draft.position,
        rotation: updateProps.rotation ?? draft.rotation,
        side: updateProps.side ?? draft.side,
        metadata: updateProps.metadata ?? stripTransient(draft.metadata),
      });
      useScene.getState().createNode(finalNode, parentId);

      useScene.temporal.getState().pause();

      adoptedRef.current = false;
      originalStateRef.current = null;
      return finalNode.id;
    },
    []
  );

  const destroy = useCallback(() => {
    if (!draftRef.current) {
      return;
    }

    if (adoptedRef.current && originalStateRef.current) {
      const original = originalStateRef.current;
      const id = draftRef.current.id;

      useScene.getState().updateNode(id, {
        position: original.position,
        rotation: original.rotation,
        side: original.side,
        parentId: original.parentId,
        metadata: original.metadata,
      });

      const mesh = sceneRegistry.nodes.get(id as AnyNodeId);
      if (mesh) {
        mesh.position.set(
          original.position[0],
          original.position[1],
          original.position[2]
        );
        mesh.rotation.y = original.rotation[1] ?? 0;
        mesh.visible = true;
      }
    } else {
      useScene.getState().deleteNode(draftRef.current.id);
    }

    draftRef.current = null;
    adoptedRef.current = false;
    originalStateRef.current = null;
  }, []);

  return useMemo(
    () => ({
      get current() {
        return draftRef.current;
      },
      get isAdopted() {
        return adoptedRef.current;
      },
      create,
      adopt,
      commit,
      destroy,
    }),
    [create, adopt, commit, destroy]
  );
}
