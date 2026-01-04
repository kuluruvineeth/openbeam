import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

export async function initializeBuiltinSkills(): Promise<number> {
  const { skillRegistry } = await import("./registry");
  const builtinPath = getBuiltinSkillsPath();
  return skillRegistry.discoverSkills(builtinPath);
}

export async function initializeSkills(
  customSkillsPath?: string
): Promise<{ builtin: number; custom: number }> {
  const { skillRegistry } = await import("./registry");
  const { registerSkillTools } = await import("./tools");

  registerSkillTools();

  const builtinPath = getBuiltinSkillsPath();
  const builtin = await skillRegistry.discoverSkills(builtinPath);

  let custom = 0;
  if (customSkillsPath) {
    custom = await skillRegistry.discoverSkills(customSkillsPath);
  }

  return { builtin, custom };
}
