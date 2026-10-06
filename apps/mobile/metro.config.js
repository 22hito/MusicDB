// Metro для монорепо: Expo сам знаходить корінь робочого простору й спільні пакети.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Пакети робочого простору — сирцевий TypeScript (exports → src/*.ts).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
