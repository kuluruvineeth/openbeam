import { describe, expect, it } from "bun:test";
import {
  mapClawhubCatalogResponse,
  mapSkillsShCatalogResponse,
  mergeExternalCatalogEntries,
} from "../ai.skills-catalog";

describe("ai skills catalog", () => {
  it("maps skills.sh payload into normalized catalog items", () => {
    const items = mapSkillsShCatalogResponse({
      skills: [
        {
          source: "openclaw/skills",
          skillId: "agent-browser",
          name: "Agent Browser",
          installs: 12_345,
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "agent-browser",
      displayName: "Agent Browser",
      source: "openclaw/skills",
      provider: "skills.sh",
      installs: 12_345,
      downloads: null,
      stars: null,
    });
  });

  it("maps clawhub payload and preserves metadata", () => {
    const items = mapClawhubCatalogResponse({
      items: [
        {
          slug: "crm-automation",
          displayName: "CRM Automation",
          summary: "Pipeline and lead automation",
          tags: {
            crm: "1.0.0",
            latest: "1.0.0",
          },
          stats: {
            downloads: 9500,
            installsAllTime: 1500,
            stars: 9,
          },
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "crm-automation",
      displayName: "CRM Automation",
      description: "Pipeline and lead automation",
      provider: "clawhub",
      installs: 1500,
      downloads: 9500,
      stars: 9,
    });
    expect(items[0]?.tags).toEqual(["crm"]);
    expect(items[0]?.url).toContain("/skills?q=crm-automation");
  });

  it("merges duplicate provider entries by skill name", () => {
    const merged = mergeExternalCatalogEntries([
      {
        name: "lead-enrichment",
        displayName: "Lead Enrichment",
        description: null,
        source: "openclaw/skills",
        provider: "skills.sh",
        providers: ["skills.sh"],
        installs: 5000,
        downloads: null,
        stars: null,
        tags: ["crm"],
        url: "https://skills.sh",
      },
      {
        name: "lead-enrichment",
        displayName: "Lead Enrichment Pro",
        description: "ClawHub profile",
        source: "clawhub.ai",
        provider: "clawhub",
        providers: ["clawhub"],
        installs: 1000,
        downloads: 8000,
        stars: 4,
        tags: ["sales"],
        url: "https://clawhub.ai/skills?q=lead-enrichment",
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.providers.sort()).toEqual(["clawhub", "skills.sh"]);
    expect(merged[0]?.installs).toBe(5000);
    expect(merged[0]?.downloads).toBe(8000);
    expect(merged[0]?.stars).toBe(4);
    expect(merged[0]?.tags.sort()).toEqual(["crm", "sales"]);
  });
});
