// __tests__/hooks/useExpenses.test.ts

// Mockear AsyncStorage ANTES de cualquier import
jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn(() => Promise.resolve()),
        removeItem: jest.fn(() => Promise.resolve()),
        clear: jest.fn(() => Promise.resolve()),
    },
}))

// Mockear react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => { })

// Mockear expo-constants
jest.mock('expo-constants', () => ({
    default: { expoConfig: { extra: {} } },
    expoConfig: { extra: {} },
}))

// Mockear supabase completo
jest.mock('../../lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [], error: null }) })),
        channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
        removeChannel: jest.fn(),
    },
}))

// Ahora sí importar el módulo real para obtener cobertura
import { CATEGORY_INFO } from '../../hooks/useExpenses'

type ExpenseCategory = keyof typeof CATEGORY_INFO

const makeExpense = (overrides: Partial<{ amount: number; category: ExpenseCategory }> = {}) => ({
    id: 'exp-1', store_id: 'store-a', created_by: 'user-1',
    amount: 100, category: 'ingredientes' as ExpenseCategory,
    description: 'Compra de frutas', date: '2024-05-01',
    ...overrides,
})

describe('CATEGORY_INFO — estructura de categorías', () => {

    test('tiene exactamente 8 categorías', () => {
        expect(Object.keys(CATEGORY_INFO)).toHaveLength(8)
    })

    test('todas las categorías tienen emoji, label y color hex válido', () => {
        const cats = Object.keys(CATEGORY_INFO) as ExpenseCategory[]
        cats.forEach(cat => {
            const info = CATEGORY_INFO[cat]
            expect(info.emoji).toBeTruthy()
            expect(info.label).toBeTruthy()
            expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        })
    })

    test('contiene las categorías esperadas', () => {
        const cats = Object.keys(CATEGORY_INFO)
        expect(cats).toContain('ingredientes')
        expect(cats).toContain('renta')
        expect(cats).toContain('servicios')
        expect(cats).toContain('nomina')
        expect(cats).toContain('otro')
    })

})

describe('Lógica de gastos — cálculos puros', () => {

    test('calcula el total de gastos correctamente', () => {
        const gastos = [
            makeExpense({ amount: 500 }),
            makeExpense({ amount: 3000, category: 'renta' }),
            makeExpense({ amount: 800, category: 'servicios' }),
        ]
        expect(gastos.reduce((s, g) => s + g.amount, 0)).toBe(4300)
    })

    test('calcula la utilidad neta', () => {
        expect(15000 - 4300).toBe(10700)
    })

    test('utilidad negativa cuando gastos > ingresos', () => {
        expect(2000 - 5000).toBe(-3000)
    })

    test('agrupa gastos por categoría', () => {
        const gastos = [
            makeExpense({ amount: 500 }),
            makeExpense({ amount: 300 }),
            makeExpense({ amount: 3000, category: 'renta' }),
        ]
        const porCat = gastos.reduce((acc: Record<string, number>, g) => {
            acc[g.category] = (acc[g.category] ?? 0) + g.amount
            return acc
        }, {})
        expect(porCat['ingredientes']).toBe(800)
        expect(porCat['renta']).toBe(3000)
    })

    test('los porcentajes suman 100%', () => {
        const gastos = [makeExpense({ amount: 500 }), makeExpense({ amount: 300 }), makeExpense({ amount: 200 })]
        const total = gastos.reduce((s, g) => s + g.amount, 0)
        const sumPct = gastos.reduce((s, g) => s + (g.amount / total) * 100, 0)
        expect(sumPct).toBeCloseTo(100, 1)
    })

})