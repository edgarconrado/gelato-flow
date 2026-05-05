// __tests__/store/cartStore.coverage.test.ts

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(() => Promise.resolve(null)), setItem: jest.fn(() => Promise.resolve()), removeItem: jest.fn(() => Promise.resolve()), clear: jest.fn(() => Promise.resolve()) },
}))
jest.mock('react-native-url-polyfill/auto', () => { })
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } }, expoConfig: { extra: {} } }))
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' }, NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' } }))
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: jest.fn().mockResolvedValue('id'), setNotificationHandler: jest.fn(), getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }), requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }), setNotificationChannelAsync: jest.fn(), AndroidImportance: { HIGH: 5 } }))
jest.mock('expo-device', () => ({ isDevice: true }))
jest.mock('../../hooks/useNotifications', () => ({ notify: jest.fn() }))

// Mock de supabase con factory — control total sobre cada tabla
jest.mock('../../lib/supabase', () => {
    const mockSaleChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'sale-123' }, error: null }),
    }
    const mockProductChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { stock: 10, name: 'Paleta' }, error: null }),
    }
    return {
        supabase: {
            from: jest.fn((table: string) => {
                if (table === 'sales') return { insert: jest.fn().mockReturnValue(mockSaleChain) }
                if (table === 'sale_items') return { insert: jest.fn().mockResolvedValue({ error: null }) }
                if (table === 'products') return mockProductChain
                return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
            }),
            rpc: jest.fn().mockResolvedValue({ error: null }),
            channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
            removeChannel: jest.fn(),
        },
        Product: {}, CartItem: {}, PaymentMethod: {},
    }
})

import { useCartStore } from '../../store'

const makeProduct = (overrides = {}) => ({
    id: 'prod-1', name: 'Paleta de Mango', price: 15.00,
    stock: 50, store_id: 'store-a', active: true,
    category_id: 'cat-1', type: 'paleta' as const, min_stock: 5,
    ...overrides,
})

beforeEach(() => { useCartStore.getState().clearCart() })
afterEach(() => { jest.clearAllMocks() })

describe('CartStore real — addItem', () => {

    test('agrega producto nuevo', () => {
        useCartStore.getState().addItem(makeProduct())
        expect(useCartStore.getState().items).toHaveLength(1)
        expect(useCartStore.getState().items[0].quantity).toBe(1)
    })

    test('incrementa cantidad si ya existe', () => {
        const p = makeProduct()
        useCartStore.getState().addItem(p)
        useCartStore.getState().addItem(p)
        expect(useCartStore.getState().items[0].quantity).toBe(2)
    })

    test('productos distintos son items separados', () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p1' }))
        useCartStore.getState().addItem(makeProduct({ id: 'p2' }))
        expect(useCartStore.getState().items).toHaveLength(2)
    })

})

describe('CartStore real — removeItem', () => {

    test('elimina producto específico', () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p1' }))
        useCartStore.getState().addItem(makeProduct({ id: 'p2' }))
        useCartStore.getState().removeItem('p1')
        expect(useCartStore.getState().items).toHaveLength(1)
        expect(useCartStore.getState().items[0].product.id).toBe('p2')
    })

})

describe('CartStore real — updateQuantity', () => {

    test('actualiza la cantidad', () => {
        useCartStore.getState().addItem(makeProduct())
        useCartStore.getState().updateQuantity('prod-1', 7)
        expect(useCartStore.getState().items[0].quantity).toBe(7)
    })

    test('elimina si cantidad llega a 0', () => {
        useCartStore.getState().addItem(makeProduct())
        useCartStore.getState().updateQuantity('prod-1', 0)
        expect(useCartStore.getState().items).toHaveLength(0)
    })

    test('elimina si cantidad es negativa', () => {
        useCartStore.getState().addItem(makeProduct())
        useCartStore.getState().updateQuantity('prod-1', -1)
        expect(useCartStore.getState().items).toHaveLength(0)
    })

})

describe('CartStore real — total()', () => {

    test('total 0 con carrito vacío', () => {
        expect(useCartStore.getState().total()).toBe(0)
    })

    test('calcula total multi-producto', () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p1', price: 15 }))
        useCartStore.getState().addItem(makeProduct({ id: 'p1', price: 15 }))
        useCartStore.getState().addItem(makeProduct({ id: 'p2', price: 20 }))
        expect(useCartStore.getState().total()).toBe(50)
    })

    test('precisión decimal', () => {
        const p = makeProduct({ price: 18.50 })
        useCartStore.getState().addItem(p)
        useCartStore.getState().addItem(p)
        expect(useCartStore.getState().total()).toBeCloseTo(37.00, 2)
    })

})

describe('CartStore real — clearCart()', () => {

    test('vacía completamente', () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p1' }))
        useCartStore.getState().addItem(makeProduct({ id: 'p2' }))
        useCartStore.getState().clearCart()
        expect(useCartStore.getState().items).toHaveLength(0)
        expect(useCartStore.getState().total()).toBe(0)
    })

})

describe('CartStore real — checkout()', () => {

    test('retorna error con carrito vacío', async () => {
        const result = await useCartStore.getState().checkout('store-a', 'user-1', 'cash')
        expect(result.error).toBe('El carrito está vacío')
        expect(result.saleId).toBeNull()
    })

    test('checkout exitoso retorna saleId', async () => {
        // Arrange
        useCartStore.getState().addItem(makeProduct())

        // Act
        const result = await useCartStore.getState().checkout('store-a', 'user-1', 'cash')

        // Assert
        expect(result.error).toBeNull()
        expect(result.saleId).toBe('sale-123')
        expect(useCartStore.getState().items).toHaveLength(0)
    })

    test('checkout con tarjeta funciona igual', async () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p2', price: 25 }))
        const result = await useCartStore.getState().checkout('store-a', 'user-1', 'card')
        expect(result.error).toBeNull()
    })

    test('checkout con transferencia funciona igual', async () => {
        useCartStore.getState().addItem(makeProduct({ id: 'p3' }))
        const result = await useCartStore.getState().checkout('store-a', 'user-1', 'transfer')
        expect(result.error).toBeNull()
    })

})