import type { DocuSignClient } from "../client";

export interface EnvelopeActionResult {
  success: boolean;
  envelopeId?: string;
  url?: string;
  error?: string;
}

type CreateEnvelopeResponse = {
  envelopeId: string;
  uri: string;
  statusDateTime: string;
  status: string;
};

export async function createDocuSignEnvelope(
  client: DocuSignClient,
  params: {
    emailSubject: string;
    emailBlurb?: string;
    status?: string;
    templateId?: string;
    recipients?: {
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
    };
  }
): Promise<EnvelopeActionResult> {
  try {
    const body: Record<string, unknown> = {
      emailSubject: params.emailSubject,
      status: params.status ?? "created",
    };

    if (params.emailBlurb) {
      body.emailBlurb = params.emailBlurb;
    }
    if (params.templateId) {
      body.templateId = params.templateId;
    }
    if (params.recipients) {
      body.recipients = params.recipients;
    }

    const result = await client.post<CreateEnvelopeResponse>(
      "/envelopes",
      body
    );

    const appBaseUrl = client.baseUri
      .replace("//na", "//app.na")
      .replace("//eu", "//app.eu");

    return {
      success: true,
      envelopeId: result.envelopeId,
      url: `${appBaseUrl}/documents/details/${result.envelopeId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create envelope",
    };
  }
}

export async function voidDocuSignEnvelope(
  client: DocuSignClient,
  envelopeId: string,
  voidedReason: string
): Promise<EnvelopeActionResult> {
  try {
    await client.put<Record<string, unknown>>(`/envelopes/${envelopeId}`, {
      status: "voided",
      voidedReason,
    });

    return {
      success: true,
      envelopeId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to void envelope",
    };
  }
}

export async function resendDocuSignEnvelope(
  client: DocuSignClient,
  envelopeId: string
): Promise<EnvelopeActionResult> {
  try {
    await client.put<Record<string, unknown>>(
      `/envelopes/${envelopeId}?resend_envelope=true`,
      {}
    );

    return {
      success: true,
      envelopeId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend envelope",
    };
  }
}
