import { describe, expect, it } from "bun:test";
import type {
  TransformContext,
  WebhookConfig,
} from "@openbeam/types/services/connectors/custom-webhook";
import {
  applyContentTemplate,
  extractEventType,
  resolveJsonPath,
  transformWebhookPayload,
} from "../transform";

describe("resolveJsonPath", () => {
  const payload = {
    event: "issue.created",
    data: {
      id: "ISS-42",
      title: "Fix login bug",
      nested: { deep: { value: 99 } },
      tags: ["urgent", "frontend", "auth"],
    },
  };

  it("resolves top-level field", () => {
    expect(resolveJsonPath(payload, "event")).toBe("issue.created");
  });

  it("resolves nested field", () => {
    expect(resolveJsonPath(payload, "data.id")).toBe("ISS-42");
  });

  it("resolves deeply nested field", () => {
    expect(resolveJsonPath(payload, "data.nested.deep.value")).toBe(99);
  });

  it("resolves array index", () => {
    expect(resolveJsonPath(payload, "data.tags[1]")).toBe("frontend");
  });

  it("returns undefined for missing path", () => {
    expect(resolveJsonPath(payload, "data.nonexistent")).toBeUndefined();
  });

  it("handles $. prefix", () => {
    expect(resolveJsonPath(payload, "$.data.title")).toBe("Fix login bug");
  });
});

describe("applyContentTemplate", () => {
  const payload = {
    title: "Release v2",
    body: "Major update",
    author: { name: "Jane" },
  };

  it("replaces placeholders with values", () => {
    const result = applyContentTemplate(
      "{{title}} by {{author.name}}",
      payload
    );
    expect(result).toBe("Release v2 by Jane");
  });

  it("replaces nested placeholders", () => {
    const result = applyContentTemplate("Author: {{author.name}}", payload);
    expect(result).toBe("Author: Jane");
  });

  it("replaces missing values with empty string", () => {
    const result = applyContentTemplate("{{title}} - {{missing}}", payload);
    expect(result).toBe("Release v2 - ");
  });
});

describe("extractEventType", () => {
  it("extracts from header", () => {
    const config: WebhookConfig = {
      eventTypeHeader: "X-Event-Type",
      maxPayloadBytes: 1_048_576,
    };
    const headers = { "x-event-type": "push" };
    expect(extractEventType(headers, {}, config)).toBe("push");
  });

  it("extracts from payload", () => {
    const config: WebhookConfig = {
      eventTypeField: "event",
      maxPayloadBytes: 1_048_576,
    };
    expect(extractEventType({}, { event: "issue.created" }, config)).toBe(
      "issue.created"
    );
  });

  it("prefers header over payload", () => {
    const config: WebhookConfig = {
      eventTypeHeader: "X-Event",
      eventTypeField: "event",
      maxPayloadBytes: 1_048_576,
    };
    const headers = { "x-event": "from-header" };
    expect(extractEventType(headers, { event: "from-payload" }, config)).toBe(
      "from-header"
    );
  });
});

describe("transformWebhookPayload", () => {
  const ctx: TransformContext = {
    connectorId: "conn_abc",
    teamId: "team_123",
    workspaceId: "ws_456",
    slug: "my-app",
  };

  const baseConfig: WebhookConfig = {
    eventTypeField: "action",
    eventMappings: {
      "issue.created": {
        action: "upsert",
        idPath: "issue.id",
        fieldMapping: {
          "issue.title": "title",
          "issue.body": "content",
          "issue.url": "url",
        },
        documentType: "issue",
      },
      "issue.deleted": {
        action: "delete",
        idPath: "issue.id",
        fieldMapping: {},
        documentType: "issue",
      },
    },
    maxPayloadBytes: 1_048_576,
  };

  it("transforms upsert event into GenericDocument", () => {
    const payload = {
      action: "issue.created",
      issue: {
        id: "42",
        title: "Bug report",
        body: "Details here",
        url: "https://example.com/42",
      },
    };

    const result = transformWebhookPayload(payload, {}, baseConfig, ctx);
    expect(result.success).toBe(true);
    expect(result.action).toBe("upsert");
    expect(result.documentId).toBe("conn_abc_issue_42");
    expect(result.document).toBeDefined();
    const doc = result.document as Record<string, unknown>;
    expect(doc.title).toBe("Bug report");
    expect(doc.content).toBe("Details here");
    expect(doc.connector_id).toBe("conn_abc");
    expect(doc.team_id).toBe("team_123");
  });

  it("transforms delete event", () => {
    const payload = {
      action: "issue.deleted",
      issue: { id: "42" },
    };

    const result = transformWebhookPayload(payload, {}, baseConfig, ctx);
    expect(result.success).toBe(true);
    expect(result.action).toBe("delete");
    expect(result.documentId).toBe("conn_abc_issue_42");
  });

  it("ignores unrecognized event type without default mapping", () => {
    const payload = { action: "comment.created", comment: { id: "1" } };

    const result = transformWebhookPayload(payload, {}, baseConfig, ctx);
    expect(result.success).toBe(true);
    expect(result.action).toBe("ignore");
  });

  it("filters events not in eventFilter", () => {
    const config: WebhookConfig = {
      ...baseConfig,
      eventFilter: ["issue.created"],
    };
    const payload = { action: "issue.deleted", issue: { id: "42" } };

    const result = transformWebhookPayload(payload, {}, config, ctx);
    expect(result.success).toBe(true);
    expect(result.action).toBe("ignore");
  });

  it("applies content template", () => {
    const config: WebhookConfig = {
      ...baseConfig,
      contentTemplate: "Issue: {{issue.title}} - {{issue.body}}",
    };
    const payload = {
      action: "issue.created",
      issue: { id: "42", title: "Bug", body: "Details" },
    };

    const result = transformWebhookPayload(payload, {}, config, ctx);
    const doc = result.document as Record<string, unknown>;
    expect(doc.content).toBe("Issue: Bug - Details");
  });

  it("uses default mapping for unmatched event types", () => {
    const config: WebhookConfig = {
      eventTypeField: "type",
      defaultMapping: {
        action: "upsert",
        idPath: "id",
        fieldMapping: { name: "title", description: "content" },
        documentType: "generic",
      },
      maxPayloadBytes: 1_048_576,
    };
    const payload = {
      type: "unknown.event",
      id: "99",
      name: "Something",
      description: "Some content",
    };

    const result = transformWebhookPayload(payload, {}, config, ctx);
    expect(result.success).toBe(true);
    expect(result.action).toBe("upsert");
    expect(result.documentId).toBe("conn_abc_generic_99");
  });

  it("returns error when document ID cannot be extracted", () => {
    const payload = {
      action: "issue.created",
      issue: {},
    };

    const result = transformWebhookPayload(payload, {}, baseConfig, ctx);
    expect(result.success).toBe(false);
    expect(result.action).toBe("error");
    expect(result.error).toContain("Cannot extract document ID");
  });

  it("applies url template", () => {
    const config: WebhookConfig = {
      ...baseConfig,
      urlTemplate: "https://app.example.com/issues/{{issue.id}}",
    };
    const payload = {
      action: "issue.created",
      issue: { id: "42", title: "Bug", body: "Fix it" },
    };

    const result = transformWebhookPayload(payload, {}, config, ctx);
    const doc = result.document as Record<string, unknown>;
    expect(doc.url).toBe("https://app.example.com/issues/42");
  });
});
