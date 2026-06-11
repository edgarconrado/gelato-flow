// app.config.js
export default {
  expo: {
    name: 'Gelato Flow',
    slug: 'gelato-flow-app',
    version: '1.1.0r01',
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
      bundleIdentifier: 'com.jacarandalab.gelatoflow',
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'Gelato Flow necesita acceso a tu galería para actualizar tu foto de perfil.',
        NSCameraUsageDescription: 'Gelato Flow necesita acceso a tu cámara para tomar una foto de perfil.',
      },
    },
    android: {
      package: 'com.jacarandalab.gelatoflow',
      versionCode: 5,
      edgeToEdgeEnabled: true,
      permissions: [
        // READ_MEDIA_IMAGES removido — usamos Photo Picker (no requiere permiso)
        // El Photo Picker de Android es el selector nativo del sistema
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
          photosPermission: 'Gelato Flow necesita acceso a tu galería para subir fotos.',
          cameraPermission: 'Gelato Flow necesita acceso a tu cámara para tomar fotos.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      createStoreSecret: process.env.EXPO_PUBLIC_CREATE_STORE_SECRET ?? 'gelato_create_store_2026',
      revenueCatApiKey: 'test_xrWqYOUIamZzVVLLYodveSaHACO',
      revenueCatAndroidKey: 'goog_sVOLrQWgVPtDgcuoEVwNJHZFEyT',
      eas: {
        projectId: '34e3d317-1a87-43a0-a9ef-1c4ec47d36d5',
      },
    },
  },
}