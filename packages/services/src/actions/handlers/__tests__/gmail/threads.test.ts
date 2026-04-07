import { beforeEach, describe, expect, it } from "bun:test";
import { getThreadMock, resetMocks, run, trashThreadMock } from "./fixtures";

describe("gmail thread actions", () => {
  beforeEach(resetMocks);

  describe("thread_get", () => {
    it("returns thread with messages", async () => {
      const result = await run("thread_get", { threadId: "t1" });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: "t1",
        snippet: "hi",
      });
      expect(result.data.messages).toHaveLength(1);
      expect(getThreadMock).toHaveBeenCalledTimes(1);
    });

    it("throws when thread not found", async () => {
      getThreadMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("thread_get", { threadId: "t1" })).rejects.toThrow(
        "Thread not found"
      );
    });
  });

  describe("thread_trash", () => {
    it("trashes a thread", async () => {
      const result = await run("thread_trash", { threadId: "t1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ threadId: "t1" });
      expect(trashThreadMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      trashThreadMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not found" })
      );
      const result = await run("thread_trash", { threadId: "t1" });
      expect(result.success).toBe(false);
    });
  });
});
