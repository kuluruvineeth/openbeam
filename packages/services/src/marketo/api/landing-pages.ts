import type { MarketoClient } from "../client";

export type MarketoLandingPage = {
  id: number;
  name: string;
  description: string | null;
  url: string | null;
  status: string;
  template: number | null;
  folder: { type: string; value: number; folderName?: string } | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  robots: string | null;
  formPrefill: boolean;
  mobileEnabled: boolean;
};

export function listAllLandingPages(
  client: MarketoClient
): AsyncGenerator<MarketoLandingPage[], void, undefined> {
  return client.listAllAssets<MarketoLandingPage>("/v1/landingPages.json", {
    status: "approved",
  });
}
