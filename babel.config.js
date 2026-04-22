// babel.config.js
// SDK 54: babel-preset-expo handles Reanimated v4 worklets automatically.
// NO necesitas agregar 'react-native-reanimated/plugin' manualmente.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
