// app.config.js
export default {
  expo: {
    name: 'Gelato Flow',
    slug: 'gelato-flow-app',
    version: '1.0.0',
    scheme: 'gelatoflow',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'mx.jacarandalab.gelatoflow',
    },
    android: {
      package: 'mx.jacarandalab.gelatoflow',
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: 'caf53e81-0efe-4d3d-9e0d-99cb5e9aead3',
      },
    },
  },
}