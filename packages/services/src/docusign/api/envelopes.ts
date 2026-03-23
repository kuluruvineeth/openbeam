import type { DocuSignClient } from "../client";

export type DocuSignEnvelope = {
  envelopeId: string;
  status: string;
  emailSubject: string;
  emailBlurb?: string;
  sentDateTime?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  completedDateTime?: string;
  voidedDateTime?: string;
  voidedReason?: string;
  sender?: {
    userName: string;
    email: string;
    userId?: string;
  };
  recipients?: {
    signers?: DocuSignRecipient[];
    carbonCopies?: DocuSignRecipient[];
  };
  purgeState?: string;
  envelopeUri?: string;
};

export type DocuSignRecipient = {
  recipientId: string;
  name: string;
  email: string;
  status: string;
  signedDateTime?: string;
  deliveredDateTime?: string;
  routingOrder?: string;
  roleName?: string;
};

type EnvelopeListResponse = {
  envelopes?: DocuSignEnvelope[];
  resultSetSize: string;
  startPosition: string;
  endPosition: string;
  totalSetSize: string;
  nextUri?: string;
};

type EnvelopeRecipientsResponse = {
  signers?: DocuSignRecipient[];
  carbonCopies?: DocuSignRecipient[];
};

export type ListEnvelopesParams = {
  fromDate: string;
  toDate?: string;
  status?: string;
  orderBy?: string;
  order?: string;
  startPosition?: number;
  count?: number;
};

export async function* listAllEnvelopes(
  client: DocuSignClient,
  params: ListEnvelopesParams
): AsyncGenerator<DocuSignEnvelope[], void, undefined> {
  let startPosition = params.startPosition ?? 0;
  const count = params.count ?? 100;
  let hasMore = true;

  while (hasMore) {
    const queryParams: Record<string, string> = {
      from_date: params.fromDate,
      start_position: String(startPosition),
      count: String(count),
      order_by: params.orderBy ?? "last_modified",
      order: params.order ?? "desc",
    };

    if (params.toDate) {
      queryParams.to_date = params.toDate;
    }
    if (params.status) {
      queryParams.status = params.status;
    }

    const response = await client.get<EnvelopeListResponse>(
      "/envelopes",
      queryParams
    );

    const envelopes = response.envelopes ?? [];
    if (envelopes.length > 0) {
      yield envelopes;
    }

    const totalSize = Number.parseInt(response.totalSetSize, 10);
    startPosition += envelopes.length;
    hasMore = startPosition < totalSize && envelopes.length > 0;
  }
}

export function getEnvelopeRecipients(
  client: DocuSignClient,
  envelopeId: string
): Promise<EnvelopeRecipientsResponse> {
  return client.get<EnvelopeRecipientsResponse>(
    `/envelopes/${envelopeId}/recipients`
  );
}
