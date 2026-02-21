// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the project root (mobile directory)
const projectRoot = __dirname;

// Get the workspace root (parent directory where convex is located)
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Configure Metro to watch the parent directory's convex folder
config.watchFolders = [workspaceRoot];

// Force Metro to resolve runtime deps from mobile/node_modules only.
// This prevents loading a second React version from workspace root, which can
// crash Android release builds with white screen + process exit.
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
  extraNodeModules: {
    react: path.resolve(projectRoot, 'node_modules/react'),
    'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
    'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
    'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
    expo: path.resolve(projectRoot, 'node_modules/expo'),
  },
};

module.exports = config;
