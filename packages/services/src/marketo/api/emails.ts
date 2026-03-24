import type { MarketoClient } from "../client";

export type MarketoEmail = {
  id: number;
  name: string;
  description: string | null;
  subject: { type: string; value: string } | null;
  fromName: { type: string; value: string } | null;
  fromEmail: { type: string; value: string } | null;
  replyEmail: { type: string; value: string } | null;
  status: string;
  template: number | null;
  url: string | null;
  folder: { type: string; value: number; folderName?: string } | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
  operational: boolean;
  textOnly: boolean;
};

export function listAllEmails(
  client: MarketoClient
): AsyncGenerator<MarketoEmail[], void, undefined> {
  return client.listAllAssets<MarketoEmail>("/v1/emails.json", {
    status: "approved",
  });
}
