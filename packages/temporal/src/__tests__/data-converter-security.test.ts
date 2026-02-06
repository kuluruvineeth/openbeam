import { encodingTypes, type Payload } from "@temporalio/common";
import { describe, expect, it } from "vitest";
import { RedactingPayloadCodec } from "../security/data-converter";

describe("RedactingPayloadCodec", () => {
  const codec = new RedactingPayloadCodec();

  function createPayload(data: unknown): Payload {
    return {
      metadata: {
        encoding: Buffer.from(encodingTypes.METADATA_ENCODING_JSON),
      },
      data: new TextEncoder().encode(JSON.stringify(data)),
    };
  }

  function decodePayload(payload: Payload | undefined): unknown {
    if (!payload?.data) {
      return null;
    }
    return JSON.parse(Buffer.from(payload.data).toString("utf-8"));
  }

  it("redacts sensitive fields in canvas node configs", async () => {
    const canvasInput = {
      executionId: "exec_123",
      agentCanvasId: "canvas_456",
      teamId: "team_789",
      input: {
        canvas: {
          nodes: [
            {
              id: "http_node_1",
              type: "httpRequest",
              data: {
                config: {
                  url: "https://api.example.com",
                  auth: {
                    type: "bearer",
                    token: "secret_token_12345",
                    apiKeyValue: "ak_production_key",
                    oauth2ClientSecret: "oauth_secret_xyz",
                  },
                },
              },
            },
            {
              id: "webhook_node_1",
              type: "webhook",
              data: {
                config: {
                  path: "/webhook",
                  secret: "webhook_secret_abc",
                  webhookSecret: "another_secret_def",
                },
              },
            },
          ],
          settings: {
            environment: {
              DATABASE_PASSWORD: "db_password_123",
              API_KEY: "env_api_key_456",
            },
          },
        },
      },
    };

    const payload = createPayload(canvasInput);
    const [encoded] = await codec.encode([payload]);
    const result = decodePayload(encoded);

    expect(result).toMatchObject({
      executionId: "exec_123",
      agentCanvasId: "canvas_456",
      teamId: "team_789",
      input: {
        canvas: {
          nodes: [
            {
              id: "http_node_1",
              type: "httpRequest",
              data: {
                config: {
                  url: "https://api.example.com",
                  auth: {
                    type: "bearer",
                    token: "[REDACTED]",
                    apiKeyValue: "[REDACTED]",
                    oauth2ClientSecret: "[REDACTED]",
                  },
                },
              },
            },
            {
              id: "webhook_node_1",
              type: "webhook",
              data: {
                config: {
                  path: "/webhook",
                  secret: "[REDACTED]",
                  webhookSecret: "[REDACTED]",
                },
              },
            },
          ],
          settings: {
            environment: "[REDACTED]",
          },
        },
      },
    });
  });

  it("redacts common OAuth and API credentials", async () => {
    const data = {
      connectorId: "conn_123",
      accessToken: "access_token_value",
      refreshToken: "refresh_token_value",
      apiKey: "api_key_value",
      password: "password_value",
      clientSecret: "client_secret_value",
      bearerToken: "bearer_token_value",
      authToken: "auth_token_value",
      sessionToken: "session_token_value",
      oauthToken: "oauth_token_value",
      encryptionKey: "encryption_key_value",
      signingKey: "signing_key_value",
      customHeaderValue: "custom_header_value",
      metadata: {
        name: "Test Connector",
        type: "slack",
      },
    };

    const payload = createPayload(data);
    const [encoded] = await codec.encode([payload]);
    const result = decodePayload(encoded) as typeof data;

    expect(result.connectorId).toBe("conn_123");
    expect(result.metadata.name).toBe("Test Connector");
    expect(result.metadata.type).toBe("slack");

    expect(result.accessToken).toBe("[REDACTED]");
    expect(result.refreshToken).toBe("[REDACTED]");
    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.clientSecret).toBe("[REDACTED]");
    expect(result.bearerToken).toBe("[REDACTED]");
    expect(result.authToken).toBe("[REDACTED]");
    expect(result.sessionToken).toBe("[REDACTED]");
    expect(result.oauthToken).toBe("[REDACTED]");
    expect(result.encryptionKey).toBe("[REDACTED]");
    expect(result.signingKey).toBe("[REDACTED]");
    expect(result.customHeaderValue).toBe("[REDACTED]");
  });

  it("preserves non-sensitive fields", async () => {
    const data = {
      executionId: "exec_123",
      teamId: "team_456",
      config: {
        url: "https://api.example.com",
        method: "POST",
        timeout: 30_000,
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      metadata: {
        userId: "user_789",
        timestamp: 1_706_742_000_000,
      },
    };

    const payload = createPayload(data);
    const [encoded] = await codec.encode([payload]);
    const result = decodePayload(encoded);

    expect(result).toEqual(data);
  });

  it("handles nested structures with mixed sensitive and non-sensitive data", async () => {
    const data = {
      workflow: {
        id: "wf_123",
        nodes: [
          {
            id: "node_1",
            type: "http",
            config: {
              url: "https://api.example.com",
              auth: {
                apiKey: "secret_key_123",
                username: "user@example.com",
              },
            },
          },
          {
            id: "node_2",
            type: "transform",
            config: {
              expression: "data.field",
              output: "result",
            },
          },
        ],
      },
    };

    const payload = createPayload(data);
    const [encoded] = await codec.encode([payload]);
    const result = decodePayload(encoded);

    expect(result).toMatchObject({
      workflow: {
        id: "wf_123",
        nodes: [
          {
            id: "node_1",
            type: "http",
            config: {
              url: "https://api.example.com",
              auth: {
                apiKey: "[REDACTED]",
                username: "user@example.com",
              },
            },
          },
          {
            id: "node_2",
            type: "transform",
            config: {
              expression: "data.field",
              output: "result",
            },
          },
        ],
      },
    });
  });

  it("handles arrays of objects with sensitive fields", async () => {
    const data = {
      connectors: [
        { id: "1", name: "Slack", apiKey: "slack_key_123" },
        { id: "2", name: "Linear", token: "linear_token_456" },
        { id: "3", name: "Gmail", password: "gmail_pass_789" },
      ],
    };

    const payload = createPayload(data);
    const [encoded] = await codec.encode([payload]);
    const result = decodePayload(encoded) as typeof data;

    expect(result.connectors[0]?.id).toBe("1");
    expect(result.connectors[0]?.name).toBe("Slack");
    expect(result.connectors[0]?.apiKey).toBe("[REDACTED]");

    expect(result.connectors[1]?.token).toBe("[REDACTED]");
    expect(result.connectors[2]?.password).toBe("[REDACTED]");
  });

  it("does not modify non-JSON payloads", async () => {
    const payload: Payload = {
      metadata: {
        encoding: Buffer.from("binary"),
      },
      data: new Uint8Array([1, 2, 3, 4]),
    };

    const [encoded] = await codec.encode([payload]);

    expect(encoded).toEqual(payload);
  });
});
