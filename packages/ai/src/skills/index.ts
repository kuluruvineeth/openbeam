import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { skillRegistry } from "./registry";
import { registerSkillTools } from "./tools";

export type {
  ParsedSkill,
  SkillCategory,
  SkillExample,
  SkillManifest,
  SkillResource,
  SkillTriggers,
} from "./manifest";
export {
  isValidSkillName,
  parseSkillMd,
  SkillCategorySchema,
  SkillExampleSchema,
  SkillManifestSchema,
  SkillResourceSchema,
  SkillTriggersSchema,
  validateSkillManifest,
} from "./manifest";

export type {
  RegisteredSkill,
  SkillDiscoveryInfo,
  SkillLoadOptions,
  SkillLoadResult,
} from "./registry";
export { SkillRegistry, skillRegistry } from "./registry";

export {
  getSkillInstructionsTool,
  getSkillResourceTool,
  listSkillsTool,
  loadSkillTool,
  registerSkillTools,
  skillTools,
  unloadSkillTool,
} from "./tools";

function getBuiltinSkillsPath(): string {
  try {
    const currentDir = fileURLToPath(new URL(".", import.meta.url));
    return join(currentDir, "definitions");
  } catch {
    return join(__dirname, "definitions");
  }
}

// biome-ignore lint/suspicious/useAwait: returns promise directly, caller awaits
export async function initializeBuiltinSkills(): Promise<number> {
  const builtinPath = getBuiltinSkillsPath();
  return skillRegistry.discoverSkills(builtinPath);
}

export async function initializeSkills(
  customSkillsPath?: string
): Promise<{ builtin: number; custom: number }> {
  registerSkillTools();

  const builtinPath = getBuiltinSkillsPath();
  const builtin = await skillRegistry.discoverSkills(builtinPath);

  let custom = 0;
  if (customSkillsPath) {
    custom = await skillRegistry.discoverSkills(customSkillsPath);
  }

  return { builtin, custom };
}
