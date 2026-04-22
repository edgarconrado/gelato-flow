// app.config.js
// Este archivo reemplaza app.json para builds de EAS.
// Expone las variables de entorno EXPO_PUBLIC_* al bundle de JS.
export default {
  expo: {
    name: 'Paletería App',
    slug: 'paleteria-app',
    version: '1.0.0',
    scheme: 'paleteria',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'mx.paleteria.app',
    },
    android: {
      package: 'mx.paleteria.app',
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
    // Las variables de entorno se leen aquí en tiempo de build
    // y se incrustan en el bundle de JS
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
}