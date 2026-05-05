// __tests__/hooks/useExpenses.coverage.test.ts

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(() => Promise.resolve(null)), setItem: jest.fn(() => Promise.resolve()), removeItem: jest.fn(() => Promise.resolve()), clear: jest.fn(() => Promise.resolve()) },
}))
jest.mock('react-native-url-polyfill/auto', () => { })
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } }, expoConfig: { extra: {} } }))
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' } }))
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: jest.fn().mockResolvedValue('id'), setNotificationHandler: jest.fn(), getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }), requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }), setNotificationChannelAsync: jest.fn(), AndroidImportance: { HIGH: 5 } }))
jest.mock('expo-device', () => ({ isDevice: true }))

// Crear un Proxy infinitamente encadenable que resuelve con datos al hacer await
const createInfiniteProxy = (resolveWith: any): any => {
    const handler: ProxyHandler<any> = {
        get(_target, prop) {
            if (prop === 'then') {
                // Hacer el proxy thenable (awaitable)
                return (resolve: any, reject: any) =>
                    Promise.resolve(resolveWith).then(resolve, reject)
            }
            if (prop === 'catch') {
                return (reject: any) => Promise.resolve(resolveWith).catch(reject)
            }
            // Cualquier otro método retorna el mismo proxy (encadenamiento infinito)
            return () => createInfiniteProxy(resolveWith)
        },
    }
    return new Proxy({}, handler)
}

let mockResolveData: any = { data: [], error: null }

jest.mock('../../lib/supabase', () => {
    return {
        supabase: {
            // from() retorna un proxy que soporta cualquier encadenamiento
            from: jest.fn(() => createInfiniteProxy(mockResolveData)),
            channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
            removeChannel: jest.fn(),
            rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
        },
    }
})

jest.mock('../../context/AuthContext', () => ({
    useAuth: jest.fn(() => ({
        profile: { id: 'user-1', store_id: 'store-a', role: 'owner', email: 'test@test.com' },
    })),
}))

import { CATEGORY_INFO, useExpenses } from '../../hooks/useExpenses'
import { renderHook, waitFor } from '@testing-library/react-native'

const mockExpenses = [
    { id: 'e1', store_id: 'store-a', created_by: 'user-1', amount: 500, category: 'ingredientes', description: 'Frutas', date: '2024-05-01', created_at: '2024-05-01T10:00:00Z' },
    { id: 'e2', store_id: 'store-a', created_by: 'user-1', amount: 3000, category: 'renta', description: 'Local', date: '2024-05-01', created_at: '2024-05-01T11:00:00Z' },
    { id: 'e3', store_id: 'store-a', created_by: 'user-1', amount: 800, category: 'servicios', description: 'Luz', date: '2024-05-01', created_at: '2024-05-01T12:00:00Z' },
]

describe('CATEGORY_INFO — estructura del módulo real', () => {

    test('tiene exactamente 8 categorías', () => {
        expect(Object.keys(CATEGORY_INFO)).toHaveLength(8)
    })

    test('todas tienen emoji, label y color hex válido', () => {
        Object.entries(CATEGORY_INFO).forEach(([, info]) => {
            expect(info.emoji).toBeTruthy()
            expect(info.label).toBeTruthy()
            expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        })
    })

    test('contiene las 8 categorías esperadas', () => {
        const cats = Object.keys(CATEGORY_INFO)
            ;['ingredientes', 'renta', 'servicios', 'nomina', 'equipo', 'marketing', 'impuestos', 'otro']
                .forEach(c => expect(cats).toContain(c))
    })

})

describe('useExpenses hook — filtros y cálculos', () => {

    beforeEach(() => {
        mockResolveData = { data: mockExpenses, error: null }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test('carga gastos y calcula total correctamente', async () => {
        // Arrange & Act
        const { result } = renderHook(() => useExpenses('month'))

        // Assert
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
        expect(result.current.total).toBe(4300)
        expect(result.current.expenses).toHaveLength(3)
    })

    test('byCategory agrupa correctamente', async () => {
        const { result } = renderHook(() => useExpenses('month'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

        const ingredientes = result.current.byCategory.find(c => c.category === 'ingredientes')
        expect(ingredientes?.total).toBe(500)
        expect(ingredientes?.count).toBe(1)
    })

    test('funciona con filtro "day"', async () => {
        const { result } = renderHook(() => useExpenses('day'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
        expect(result.current.expenses).toBeDefined()
    })

    test('funciona con filtro "week"', async () => {
        const { result } = renderHook(() => useExpenses('week'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
        expect(result.current.total).toBe(4300)
    })

    test('funciona con filtro "year"', async () => {
        const { result } = renderHook(() => useExpenses('year'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
        expect(result.current.expenses).toHaveLength(3)
    })

    test('total es 0 cuando no hay gastos', async () => {
        // Arrange
        mockResolveData = { data: [], error: null }

        const { result } = renderHook(() => useExpenses('month'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

        expect(result.current.total).toBe(0)
        expect(result.current.byCategory).toHaveLength(0)
    })

    test('fetch es una función invocable', async () => {
        const { result } = renderHook(() => useExpenses('month'))
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
        expect(typeof result.current.fetch).toBe('function')
    })

})