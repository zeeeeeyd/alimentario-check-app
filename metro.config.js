const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional asset extensions
config.resolver.assetExts.push(
  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  // Images
  'svg'
);

// Ensure proper handling of JSI modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;