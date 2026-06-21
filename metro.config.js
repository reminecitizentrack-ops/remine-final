// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Remplacer 'debug' par notre shim pour éviter l'erreur 'colors'
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'debug' || moduleName === 'debug/') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./shim-debug.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;