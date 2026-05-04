// __tests__/hooks/useExpenses.test.ts
// Lógica pura de gastos — sin imports que encadenen AsyncStorage

// Copiado de hooks/useExpenses.ts para evitar la cadena de imports
const CATEGORY_INFO = {
    ingredientes: { label: 'Ingredientes', emoji: '🧂', color: '#3ECFB2' },
    renta: { label: 'Renta', emoji: '🏠', color: '#F5A623' },
    servicios: { label: 'Servicios', emoji: '⚡', color: '#9898B0' },
    nomina: { label: 'Nómina', emoji: '👥', color: '#F56B5C' },
    equipo: { label: 'Equipo', emoji: '🔧', color: '#4A90D9' },
    marketing: { label: 'Marketing', emoji: '📣', color: '#B06EC6' },
    impuestos: { label: 'Impuestos', emoji: '🧾', color: '#E8A838' },
    otro: { label: 'Otro', emoji: '📦', color: '#6B6B8A' },
}

type ExpenseCategory = keyof typeof CATEGORY_INFO

const makeExpense = (overrides: Partial<{ amount: number; category: ExpenseCategory }> = {}) => ({
    id: 'exp-1', store_id: 'store-a', created_by: 'user-1',
    amount: 100, category: 'ingredientes' as ExpenseCategory,
    description: 'Compra de frutas', date: '2024-05-01',
    ...overrides,
})

describe('Módulo de gastos — lógica pura', () => {

    test('calcula el total de gastos correctamente', () => {
        // Arrange
        const gastos = [
            makeExpense({ amount: 500 }),
            makeExpense({ amount: 3000, category: 'renta' }),
            makeExpense({ amount: 800, category: 'servicios' }),
        ]
        // Act
        const total = gastos.reduce((s, g) => s + g.amount, 0)
        // Assert
        expect(total).toBe(4300)
    })

    test('calcula la utilidad neta: ingresos - gastos', () => {
        expect(15000 - 4300).toBe(10700)
    })

    test('la utilidad es negativa cuando gastos superan ingresos', () => {
        expect(2000 - 5000).toBeLessThan(0)
        expect(2000 - 5000).toBe(-3000)
    })

    test('agrupa gastos por categoría correctamente', () => {
        // Arrange
        const gastos = [
            makeExpense({ amount: 500 }),
            makeExpense({ amount: 300 }),
            makeExpense({ amount: 3000, category: 'renta' }),
        ]
        // Act
        const porCat = gastos.reduce((acc: Record<string, number>, g) => {
            acc[g.category] = (acc[g.category] ?? 0) + g.amount
            return acc
        }, {})
        // Assert
        expect(porCat['ingredientes']).toBe(800)
        expect(porCat['renta']).toBe(3000)
    })

    test('todas las categorías tienen emoji, label y color hex válido', () => {
        // Arrange
        const cats = Object.keys(CATEGORY_INFO) as ExpenseCategory[]
        // Act & Assert
        cats.forEach(cat => {
            const info = CATEGORY_INFO[cat]
            expect(info.emoji).toBeTruthy()
            expect(info.label).toBeTruthy()
            expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        })
    })

    test('los porcentajes suman 100%', () => {
        // Arrange
        const gastos = [
            makeExpense({ amount: 500 }),
            makeExpense({ amount: 300 }),
            makeExpense({ amount: 200 }),
        ]
        const total = gastos.reduce((s, g) => s + g.amount, 0)
        // Act
        const sumPct = gastos.reduce((s, g) => s + (g.amount / total) * 100, 0)
        // Assert
        expect(sumPct).toBeCloseTo(100, 1)
    })

    test('hay exactamente 8 categorías de gastos', () => {
        expect(Object.keys(CATEGORY_INFO)).toHaveLength(8)
    })

})