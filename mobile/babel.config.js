module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required for Reanimated worklets to compile to run on the UI thread.
    // Without this, all useAnimatedStyle / withSpring calls fall back to JS
    // thread and animations are either missing or janky on device.
    plugins: ['react-native-reanimated/plugin'],
  };
};
