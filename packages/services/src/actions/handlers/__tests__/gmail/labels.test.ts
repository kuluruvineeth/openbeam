import { beforeEach, describe, expect, it } from "bun:test";
import { createLabelMock, listLabelsMock, resetMocks, run } from "./fixtures";

describe("gmail label actions", () => {
  beforeEach(resetMocks);

  describe("label_list", () => {
    it("lists labels", async () => {
      const result = await run("label_list", {});
      expect(result.success).toBe(true);
      expect(result.data.labels).toHaveLength(1);
      expect(listLabelsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("label_create", () => {
    it("creates a label", async () => {
      const result = await run("label_create", { name: "Projects" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "L1", name: "Projects" });
      expect(createLabelMock).toHaveBeenCalledTimes(1);
    });

    it("passes valid labelListVisibility", async () => {
      await run("label_create", {
        name: "Hidden",
        labelListVisibility: "labelHide",
      });
      expect(createLabelMock).toHaveBeenCalledTimes(1);
    });

    it("ignores invalid labelListVisibility", async () => {
      await run("label_create", {
        name: "Bad",
        labelListVisibility: "invalid_value",
      });
      expect(createLabelMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      createLabelMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "already exists" })
      );
      const result = await run("label_create", { name: "Dup" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("already exists");
    });
  });
});
