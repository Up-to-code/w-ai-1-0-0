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

// Configure resolver to allow imports from parent directory
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
};

module.exports = config;
