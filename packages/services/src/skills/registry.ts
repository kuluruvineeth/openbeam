import { z } from "zod";

const SkillPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  tools: z.array(z.string()),
  connectorScopes: z.array(z.string()),
  outboundDestinations: z.array(z.string()),
  complianceProfile: z.string().optional(),
  hash: z.string(),
});

type SkillPack = z.infer<typeof SkillPackSchema>;

const installedPacks = new Map<string, SkillPack>();

export function installSkillPack(pack: SkillPack): void {
  installedPacks.set(pack.id, pack);
}

export function uninstallSkillPack(packId: string): boolean {
  return installedPacks.delete(packId);
}

export function getInstalledPack(packId: string): SkillPack | undefined {
  return installedPacks.get(packId);
}

export function listInstalledPacks(): SkillPack[] {
  return Array.from(installedPacks.values());
}

export function getPackTools(packId: string): string[] {
  return installedPacks.get(packId)?.tools ?? [];
}

export { SkillPackSchema };
export type { SkillPack };
