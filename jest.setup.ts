// jest.setup.ts — configuración global de pruebas
import '@testing-library/jest-native/extend-expect'

// Silenciar warnings de consola en pruebas
jest.spyOn(console, 'warn').mockImplementation(() => { })
jest.spyOn(console, 'log').mockImplementation(() => { })

// Mock de react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock')
    Reanimated.default.call = () => { }
    return Reanimated
})

// Mock de react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => children,
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

// Mock de @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}))

// Mock de expo-image
jest.mock('expo-image', () => ({
    Image: 'Image',
}))