import type { NiceCxoneClient } from "../client";

export type CxoneContact = {
  contactId: number;
  masterContactId?: number;
  contactStart: string;
  contactEnd?: string;
  agentId?: number;
  firstName?: string;
  lastName?: string;
  fromAddr?: string;
  toAddr?: string;
  skillId?: number;
  skillName?: string;
  teamId?: number;
  teamName?: string;
  campaignId?: number;
  campaignName?: string;
  mediaType?: string;
  direction?: string;
  dispositionNotes?: string;
  primaryDispositionId?: number;
  primaryDispositionName?: string;
  totalDuration?: number;
  isOutbound?: boolean;
  isRefused?: boolean;
  isShortAbandon?: boolean;
  abandoned?: boolean;
  tags?: string;
  lastUpdateTime?: string;
};

export function listCompletedContacts(
  client: NiceCxoneClient,
  startDate: string,
  endDate: string,
  params?: Record<string, string>
): AsyncGenerator<CxoneContact[], void, undefined> {
  return client.listPaged<CxoneContact>(
    "/contacts/completed",
    "completedContacts",
    { ...params, startDate, endDate }
  );
}

export function listCompletedContactsSince(
  client: NiceCxoneClient,
  since: string,
  until: string
): AsyncGenerator<CxoneContact[], void, undefined> {
  return listCompletedContacts(client, since, until);
}
