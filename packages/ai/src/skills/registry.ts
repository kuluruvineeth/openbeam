import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ParsedSkill, SkillCategory, SkillManifest } from "./manifest";
import { parseSkillMd } from "./manifest";

export interface RegisteredSkill {
  manifest: SkillManifest;
  instructions: string;
  resources: Map<string, string>;
  isLoaded: boolean;
  loadedAt?: Date;
}

export interface SkillDiscoveryInfo {
  name: string;
  description: string;
  category: SkillCategory;
  keywords: string[];
  tools: string[];
  isLoaded: boolean;
}

export interface SkillLoadOptions {
  injectIntoContext?: boolean;
}

export interface SkillLoadResult {
  skill: ParsedSkill;
  enabledTools: string[];
}

class SkillRegistry {
  private readonly skills = new Map<string, RegisteredSkill>();
  private readonly loadedSkills = new Set<string>();
  private readonly skillPaths = new Map<string, string>();
  private readonly enabledToolsBySkill = new Map<string, string[]>();

  async discoverSkills(basePath: string): Promise<number> {
    let discovered = 0;

    try {
      const entries = await readdir(basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillPath = join(basePath, entry.name);
        const manifestPath = join(skillPath, "SKILL.md");

        try {
          const content = await readFile(manifestPath, "utf-8");
          const parsed = parseSkillMd(content);

          this.register(parsed.manifest.name, {
            manifest: parsed.manifest,
            instructions: parsed.instructions,
            resources: parsed.resources,
          });

          this.skillPaths.set(parsed.manifest.name, skillPath);
          discovered += 1;
        } catch {
          // Skip directories without valid SKILL.md
        }
      }
    } catch {
      // Base path doesn't exist or not accessible
    }

    return discovered;
  }

  register(name: string, skill: Omit<RegisteredSkill, "isLoaded">): void {
    this.skills.set(name, { ...skill, isLoaded: false });
  }

  async load(
    name: string,
    _options: SkillLoadOptions = {}
  ): Promise<SkillLoadResult | null> {
    const skill = this.skills.get(name);
    if (!skill) {
      return null;
    }

    if (skill.isLoaded) {
      return {
        skill: {
          manifest: skill.manifest,
          instructions: skill.instructions,
          resources: skill.resources,
        },
        enabledTools: this.enabledToolsBySkill.get(name) ?? [],
      };
    }

    const skillPath = this.skillPaths.get(name);
    if (skillPath) {
      await this.loadResources(skill, skillPath);
    }

    const enabledTools = skill.manifest.tools ?? [];
    this.enabledToolsBySkill.set(name, enabledTools);

    skill.isLoaded = true;
    skill.loadedAt = new Date();
    this.loadedSkills.add(name);

    return {
      skill: {
        manifest: skill.manifest,
        instructions: skill.instructions,
        resources: skill.resources,
      },
      enabledTools,
    };
  }

  async loadByKeyword(keyword: string): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const [name, skill] of this.skills) {
      const keywords = skill.manifest.triggers?.keywords ?? [];
      const description = skill.manifest.description.toLowerCase();
      const skillName = skill.manifest.name.toLowerCase();

      const matches =
        skillName.includes(lowerKeyword) ||
        description.includes(lowerKeyword) ||
        keywords.some((k) => k.toLowerCase().includes(lowerKeyword));

      if (matches) {
        const result = await this.load(name);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  async loadByCategory(category: SkillCategory): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];

    for (const [name, skill] of this.skills) {
      if (skill.manifest.category === category) {
        const result = await this.load(name);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  unload(name: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) {
      return false;
    }

    skill.isLoaded = false;
    skill.loadedAt = undefined;
    skill.resources.clear();
    this.loadedSkills.delete(name);
    this.enabledToolsBySkill.delete(name);

    return true;
  }

  unloadAll(): void {
    for (const name of this.loadedSkills) {
      this.unload(name);
    }
  }

  getDiscoveryInfo(): SkillDiscoveryInfo[] {
    return Array.from(this.skills.values()).map((skill) => ({
      name: skill.manifest.name,
      description: skill.manifest.description,
      category: skill.manifest.category ?? "custom",
      keywords: skill.manifest.triggers?.keywords ?? [],
      tools: skill.manifest.tools ?? [],
      isLoaded: skill.isLoaded,
    }));
  }

  getLoadedSkillNames(): string[] {
    return Array.from(this.loadedSkills);
  }

  getAllEnabledTools(): string[] {
    const tools = new Set<string>();
    for (const skillTools of this.enabledToolsBySkill.values()) {
      for (const tool of skillTools) {
        tools.add(tool);
      }
    }
    return Array.from(tools);
  }

  isLoaded(name: string): boolean {
    return this.loadedSkills.has(name);
  }

  get(name: string): RegisteredSkill | undefined {
    return this.skills.get(name);
  }

  getInstructions(name: string): string | null {
    const skill = this.skills.get(name);
    if (!skill?.isLoaded) {
      return null;
    }
    return skill.instructions;
  }

  getAllLoadedInstructions(): string {
    const instructions: string[] = [];

    for (const name of this.loadedSkills) {
      const skill = this.skills.get(name);
      if (skill?.instructions) {
        instructions.push(`## ${skill.manifest.name}\n\n${skill.instructions}`);
      }
    }

    return instructions.join("\n\n---\n\n");
  }

  getAll(): Map<string, RegisteredSkill> {
    return new Map(this.skills);
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  size(): number {
    return this.skills.size;
  }

  loadedCount(): number {
    return this.loadedSkills.size;
  }

  clear(): void {
    this.skills.clear();
    this.loadedSkills.clear();
    this.skillPaths.clear();
    this.enabledToolsBySkill.clear();
  }

  getSkillNamesForPrompt(): string[] {
    return Array.from(this.skills.keys());
  }

  getSkillNamesWithDescriptions(): Array<{
    name: string;
    description: string;
  }> {
    return Array.from(this.skills.values()).map((skill) => ({
      name: skill.manifest.name,
      description:
        skill.manifest.description.split("\n")[0] ?? skill.manifest.description,
    }));
  }

  private async loadResources(
    skill: RegisteredSkill,
    basePath: string
  ): Promise<void> {
    if (!skill.manifest.resources) {
      return;
    }

    for (const resource of skill.manifest.resources) {
      const resourcePath = join(basePath, resource.path);
      try {
        const content = await readFile(resourcePath, "utf-8");
        skill.resources.set(resource.name, content);
      } catch {
        // Resource not found, skip
      }
    }
  }
}

export const skillRegistry = new SkillRegistry();

export { SkillRegistry };
