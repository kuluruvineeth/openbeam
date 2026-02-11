import { beforeEach, describe, expect, it } from "bun:test";
import type { SpatialAnnotation } from "@openplane/types/canvas";
import { useAnnotationStore } from "../annotation-store";

function createAnnotation(
  overrides: Partial<SpatialAnnotation> = {}
): SpatialAnnotation {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "freehand",
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ],
    intersectingNodes: [],
    author: "human",
    color: "#3b82f6",
    strokeWidth: 2,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("annotation-store", () => {
  beforeEach(() => {
    useAnnotationStore.getState().reset();
  });

  it("adds an annotation", () => {
    const annotation = createAnnotation({ id: "a1" });
    useAnnotationStore.getState().addAnnotation(annotation);

    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    expect(useAnnotationStore.getState().annotations[0]?.id).toBe("a1");
  });

  it("removes an annotation", () => {
    const a1 = createAnnotation({ id: "a1" });
    const a2 = createAnnotation({ id: "a2" });
    const store = useAnnotationStore.getState();
    store.addAnnotation(a1);
    store.addAnnotation(a2);

    useAnnotationStore.getState().removeAnnotation("a1");

    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    expect(useAnnotationStore.getState().annotations[0]?.id).toBe("a2");
  });

  it("clears active annotation when removed", () => {
    const annotation = createAnnotation({ id: "a1" });
    const store = useAnnotationStore.getState();
    store.addAnnotation(annotation);
    store.setActiveAnnotation("a1");

    expect(useAnnotationStore.getState().activeAnnotationId).toBe("a1");

    useAnnotationStore.getState().removeAnnotation("a1");
    expect(useAnnotationStore.getState().activeAnnotationId).toBeNull();
  });

  it("updates an annotation", () => {
    const annotation = createAnnotation({ id: "a1", color: "#ff0000" });
    useAnnotationStore.getState().addAnnotation(annotation);

    useAnnotationStore.getState().updateAnnotation("a1", { color: "#00ff00" });

    expect(useAnnotationStore.getState().annotations[0]?.color).toBe("#00ff00");
  });

  it("clears all annotations", () => {
    const store = useAnnotationStore.getState();
    store.addAnnotation(createAnnotation({ id: "a1" }));
    store.addAnnotation(createAnnotation({ id: "a2" }));
    store.setActiveAnnotation("a1");

    useAnnotationStore.getState().clearAnnotations();

    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    expect(useAnnotationStore.getState().activeAnnotationId).toBeNull();
  });

  it("gets annotations for a node", () => {
    const store = useAnnotationStore.getState();
    store.addAnnotation(
      createAnnotation({ id: "a1", intersectingNodes: ["node-1", "node-2"] })
    );
    store.addAnnotation(
      createAnnotation({ id: "a2", intersectingNodes: ["node-3"] })
    );
    store.addAnnotation(
      createAnnotation({ id: "a3", intersectingNodes: ["node-1"] })
    );

    const result = useAnnotationStore
      .getState()
      .getAnnotationsForNode("node-1");
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id).sort()).toEqual(["a1", "a3"]);
  });

  it("gets annotations in a region", () => {
    const store = useAnnotationStore.getState();
    store.addAnnotation(
      createAnnotation({
        id: "inside",
        points: [
          { x: 50, y: 50 },
          { x: 60, y: 60 },
        ],
      })
    );
    store.addAnnotation(
      createAnnotation({
        id: "outside",
        points: [
          { x: 500, y: 500 },
          { x: 510, y: 510 },
        ],
      })
    );

    const result = useAnnotationStore.getState().getAnnotationsInRegion({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("inside");
  });

  it("sets and reads active annotation", () => {
    const annotation = createAnnotation({ id: "a1" });
    const store = useAnnotationStore.getState();
    store.addAnnotation(annotation);
    store.setActiveAnnotation("a1");

    expect(useAnnotationStore.getState().activeAnnotationId).toBe("a1");

    useAnnotationStore.getState().setActiveAnnotation(null);
    expect(useAnnotationStore.getState().activeAnnotationId).toBeNull();
  });

  it("resets to initial state", () => {
    const store = useAnnotationStore.getState();
    store.addAnnotation(createAnnotation({ id: "a1" }));
    store.setActiveAnnotation("a1");

    useAnnotationStore.getState().reset();

    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    expect(useAnnotationStore.getState().activeAnnotationId).toBeNull();
    expect(useAnnotationStore.getState().isHydrated).toBe(true);
  });

  it("no-ops when updating non-existent annotation", () => {
    useAnnotationStore
      .getState()
      .addAnnotation(createAnnotation({ id: "a1", color: "#ff0000" }));

    useAnnotationStore
      .getState()
      .updateAnnotation("non-existent", { color: "#00ff00" });

    expect(useAnnotationStore.getState().annotations[0]?.color).toBe("#ff0000");
  });
});
