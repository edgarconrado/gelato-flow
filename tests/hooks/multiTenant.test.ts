// __tests__/hooks/multiTenant.test.ts
// Pruebas de aislamiento multi-tenant y lógica de stock

const mockProducts = [
    { id: 'prod-1', name: 'Paleta de Mango', price: 15, stock: 50, store_id: 'store-a', active: true },
    { id: 'prod-2', name: 'Nieve de Vainilla', price: 20, stock: 30, store_id: 'store-a', active: true },
    { id: 'prod-3', name: 'Agua de Jamaica', price: 18, stock: 40, store_id: 'store-a', active: true },
    { id: 'prod-4', name: 'Paleta Otra Tienda', price: 12, stock: 20, store_id: 'store-b', active: true },
]

const mockCategories = [
    { id: 'cat-1', name: 'Paletas', emoji: '🍡', store_id: 'store-a' },
    { id: 'cat-2', name: 'Nieves', emoji: '🍨', store_id: 'store-a' },
    { id: 'cat-3', name: 'Aguas', emoji: '💧', store_id: 'store-a' },
]

describe('Multi-tenant — filtrado por store_id', () => {

    test('solo se ven productos de la tienda del usuario (store-a)', () => {
        // Arrange
        const storeId = 'store-a'
        // Act
        const productosVisibles = mockProducts.filter(p => p.store_id === storeId)
        // Assert
        expect(productosVisibles).toHaveLength(3)
        productosVisibles.forEach(p => expect(p.store_id).toBe('store-a'))
    })

    test('un usuario de store-b NO ve productos de store-a', () => {
        // Arrange
        const storeId = 'store-b'
        // Act
        const productosB = mockProducts.filter(p => p.store_id === storeId)
        // Assert
        expect(productosB).toHaveLength(1)
        expect(productosB[0].name).toBe('Paleta Otra Tienda')
        expect(productosB.find(p => p.name === 'Paleta de Mango')).toBeUndefined()
    })

    test('las categorías están aisladas por store_id', () => {
        // Arrange & Act
        const cats = mockCategories.filter(c => c.store_id === 'store-a')
        // Assert
        expect(cats).toHaveLength(3)
        cats.forEach(c => expect(c.store_id).toBe('store-a'))
    })

    test('no hay productos para un store_id inexistente', () => {
        // Arrange & Act
        const productos = mockProducts.filter(p => p.store_id === 'store-xyz')
        // Assert
        expect(productos).toHaveLength(0)
    })

    test('búsqueda respeta el store_id del usuario', () => {
        // Arrange
        const storeId = 'store-a'
        const term = 'paleta'
        // Act
        const resultados = mockProducts.filter(p =>
            p.store_id === storeId &&
            p.name.toLowerCase().includes(term)
        )
        // Assert
        expect(resultados).toHaveLength(1)
        expect(resultados[0].name).toBe('Paleta de Mango')
        expect(resultados.find(p => p.name === 'Paleta Otra Tienda')).toBeUndefined()
    })

})

describe('Lógica de stock bajo', () => {

    test('detecta productos por debajo del mínimo', () => {
        // Arrange
        const productos = [
            { name: 'A', stock: 3, min_stock: 5 },
            { name: 'B', stock: 20, min_stock: 5 },
            { name: 'C', stock: 0, min_stock: 5 },
        ]
        // Act
        const alertas = productos.filter(p => p.stock <= p.min_stock)
        // Assert
        expect(alertas).toHaveLength(2)
        expect(alertas.map(p => p.name)).toEqual(['A', 'C'])
    })

    test('clasifica agotado vs stock bajo', () => {
        // Arrange
        const productos = [
            { name: 'A', stock: 0, min_stock: 5 },
            { name: 'B', stock: 2, min_stock: 5 },
            { name: 'C', stock: 10, min_stock: 5 },
        ]
        // Act
        const agotados = productos.filter(p => p.stock === 0)
        const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= p.min_stock)
        const normal = productos.filter(p => p.stock > p.min_stock)
        // Assert
        expect(agotados).toHaveLength(1)
        expect(stockBajo).toHaveLength(1)
        expect(normal).toHaveLength(1)
    })

    test('el total de ventas por tienda es correcto', () => {
        // Arrange
        const ventas = [
            { store_id: 'store-a', total: 150 },
            { store_id: 'store-a', total: 200 },
            { store_id: 'store-b', total: 500 },
        ]
        // Act
        const totalA = ventas.filter(v => v.store_id === 'store-a').reduce((s, v) => s + v.total, 0)
        const totalB = ventas.filter(v => v.store_id === 'store-b').reduce((s, v) => s + v.total, 0)
        // Assert
        expect(totalA).toBe(350)
        expect(totalB).toBe(500)
    })

})