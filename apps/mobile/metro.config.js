const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (append to defaults)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Ensure only ONE copy of React / React Native is used (monorepo dedup)
//    Without this, Metro can load react from both apps/mobile/node_modules
//    AND root node_modules, causing "useMemo of null" / "Invalid hook call".
//    Also pin expo-router and @expo/metro-runtime so they always resolve from
//    their canonical location (fixes "Unable to resolve ../../App" on web).
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "expo-router": path.resolve(projectRoot, "node_modules/expo-router"),
  "@expo/metro-runtime": path.resolve(
    monorepoRoot,
    "node_modules/@expo/metro-runtime"
  ),
};

// 4. Block root node_modules/react from being resolved
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force react, react-native, react-dom to resolve from project node_modules only
  if (
    moduleName === "react" ||
    moduleName === "react-native" ||
    moduleName === "react-dom"
  ) {
    return {
      filePath: require.resolve(moduleName, {
        paths: [path.resolve(projectRoot, "node_modules")],
      }),
      type: "sourceFile",
    };
  }
  // Use default resolution for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
