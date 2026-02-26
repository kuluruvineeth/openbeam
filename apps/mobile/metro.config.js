const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const fs = require("node:fs");
const path = require("node:path");

const JS_EXT_RE = /\.js$/;

const projectRoot = import.meta.dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const daemonSrcRoot = path.resolve(projectRoot, "../daemon/src");
const relaySrcRoot = path.resolve(projectRoot, "../../packages/relay/src");

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest ?? resolve;

config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), monorepoRoot])
);
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    ...(config.resolver.nodeModulesPaths ?? []),
    path.join(projectRoot, "node_modules"),
    path.join(monorepoRoot, "node_modules"),
  ])
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath;
  if (
    origin &&
    (origin.startsWith(daemonSrcRoot) || origin.startsWith(relaySrcRoot)) &&
    moduleName.endsWith(".js")
  ) {
    const tsModuleName = moduleName.replace(JS_EXT_RE, ".ts");
    const candidatePath = path.resolve(path.dirname(origin), tsModuleName);
    if (fs.existsSync(candidatePath)) {
      return defaultResolveRequest(context, tsModuleName, platform);
    }
  }

  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = config;
