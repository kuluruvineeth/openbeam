import { describe, expect, it } from "bun:test";
import { handler } from "./fixtures";

describe("gmail handler registration", () => {
  it("registers as gmail connector type", () => {
    expect(handler).toBeDefined();
    expect(handler?.connectorType).toBe("gmail");
  });

  it("supports all 23 actions", () => {
    const expected = [
      "email_send",
      "email_reply",
      "email_forward",
      "email_search",
      "email_get",
      "email_trash",
      "email_modify_labels",
      "label_list",
      "label_create",
      "draft_create",
      "draft_delete",
      "draft_send",
      "thread_get",
      "thread_trash",
      "message_archive",
      "message_trash",
      "message_untrash",
      "message_mark_read",
      "message_mark_unread",
      "message_star",
      "message_unstar",
      "message_add_labels",
      "message_remove_labels",
    ];
    for (const action of expected) {
      expect(handler?.supportedActions).toContain(action);
    }
    expect(handler?.supportedActions).toHaveLength(expected.length);
  });

  it("rejects unknown action", async () => {
    const result = await handler?.execute(
      "nonexistent",
      {},
      { accessToken: "t", config: { userEmail: "me@co.com" } },
      "conn_1"
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unsupported");
  });
});
