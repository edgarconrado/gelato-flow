// app.config.js
export default {
  expo: {
    name: 'Gelato Flow',
    slug: 'gelato-flow-app',
    version: '1.0.0',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      imageContentFit: 'contain',
      backgroundColor: '#1A1A2E',
    },
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
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#3ECFB2',
          defaultChannel: 'gelato-flow',
        },
      ],
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
        projectId: '34e3d317-1a87-43a0-a9ef-1c4ec47d36d5',
      },
    },
  },
}