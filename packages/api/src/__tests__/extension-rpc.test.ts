import { describe, expect, it } from "bun:test";
import {
  buildExtensionRpcUrl,
  extensionRpcContract,
  parseExtensionChatSubmitRequest,
  parseExtensionChatSubmitResponse,
} from "../extension-rpc";

describe("extension rpc contract", () => {
  it("provides stable chat submit route details", () => {
    expect(extensionRpcContract.chatSubmit.method).toBe("POST");
    expect(extensionRpcContract.chatSubmit.path).toBe(
      "/api/v1/extensions/chat/submit"
    );
  });

  it("builds endpoint URL from base url + path", () => {
    expect(
      buildExtensionRpcUrl("http://localhost:3000", "/api/v1/extensions/chat")
    ).toBe("http://localhost:3000/api/v1/extensions/chat");

    expect(
      buildExtensionRpcUrl("http://localhost:3000/", "/api/v1/extensions/chat")
    ).toBe("http://localhost:3000/api/v1/extensions/chat");
  });

  it("validates request and response payloads", () => {
    const request = parseExtensionChatSubmitRequest({
      sessionId: "session-1",
      prompt: "Summarize the active page",
      pageContext: {
        url: "https://example.com",
      },
    });

    expect(request.sessionId).toBe("session-1");

    const response = parseExtensionChatSubmitResponse({
      proposal: {
        actionId: "action-1",
        sessionId: "session-1",
        toolName: "content.extract",
        kind: "extract",
        summary: "Extract key information from the page",
        risk: "low",
        requiresApproval: false,
      },
    });

    expect(response.proposal.kind).toBe("extract");
  });
});
