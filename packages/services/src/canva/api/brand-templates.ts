import type { CanvaClient } from "../client";

export type CanvaBrandTemplate = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
};

export function listAllBrandTemplates(
  client: CanvaClient,
  params?: Record<string, string>
): AsyncGenerator<CanvaBrandTemplate[], void, undefined> {
  return client.listAll<CanvaBrandTemplate>("/brand-templates", params);
}

export function getBrandTemplate(
  client: CanvaClient,
  templateId: string
): Promise<{ brand_template: CanvaBrandTemplate }> {
  return client.get<{ brand_template: CanvaBrandTemplate }>(
    `/brand-templates/${templateId}`
  );
}
