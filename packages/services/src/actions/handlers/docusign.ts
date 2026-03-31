import {
  createDocuSignEnvelope,
  resendDocuSignEnvelope,
  voidDocuSignEnvelope,
} from "../../docusign/actions";
import {
  createDocuSignClient,
  type DocuSignClient,
} from "../../docusign/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: DocuSignClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async envelope_create(client, p) {
    const r = await createDocuSignEnvelope(client, {
      emailSubject: str(p, "emailSubject"),
      emailBlurb: typeof p.emailBlurb === "string" ? p.emailBlurb : undefined,
      status: typeof p.status === "string" ? p.status : undefined,
      templateId: typeof p.templateId === "string" ? p.templateId : undefined,
      recipients:
        typeof p.recipients === "object" && p.recipients !== null
          ? (p.recipients as {
              signers?: Array<{
                email: string;
                name: string;
                recipientId: string;
                routingOrder?: string;
              }>;
              carbonCopies?: Array<{
                email: string;
                name: string;
                recipientId: string;
                routingOrder?: string;
              }>;
            })
          : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { envelopeId: r.envelopeId, url: r.url } };
  },

  async envelope_void(client, p) {
    const r = await voidDocuSignEnvelope(
      client,
      str(p, "envelopeId"),
      str(p, "voidedReason")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { envelopeId: r.envelopeId } };
  },

  async envelope_resend(client, p) {
    const r = await resendDocuSignEnvelope(client, str(p, "envelopeId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { envelopeId: r.envelopeId } };
  },
};

registerHandler({
  connectorType: "docusign",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported DocuSign action: ${actionId}`,
      };
    }

    const client = createDocuSignClient({
      connectorId,
      accessToken: credentials.accessToken,
      accountId: (credentials.config.accountId as string) ?? "",
      baseUri: (credentials.config.baseUri as string) ?? "",
    });

    return await handler(client, params);
  },
});
