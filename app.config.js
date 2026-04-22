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
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'Gelato Flow necesita acceso a tu galería para actualizar tu foto de perfil.',
        NSCameraUsageDescription: 'Gelato Flow necesita acceso a tu cámara para tomar una foto de perfil.',
      },
    },
    android: {
      package: 'mx.jacarandalab.gelatoflow',
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_EXTERNAL_STORAGE',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'Gelato Flow necesita acceso a tu galería para actualizar tu foto de perfil.',
          cameraPermission: 'Gelato Flow necesita acceso a tu cámara para tomar una foto de perfil.',
        },
      ],
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