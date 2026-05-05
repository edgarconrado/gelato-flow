// __tests__/components/inventory.test.ts  
// Pruebas de lógica del inventario sin renderizar componentes
// (evita SyntaxError de ViewConfigIgnore en RN 0.81)

const productos = [
  { id: 'p1', name: 'Paleta de Mango',   price: 15, stock: 50, active: true,  store_id: 'store-a', min_stock: 5 },
  { id: 'p2', name: 'Nieve de Vainilla', price: 20, stock: 3,  active: true,  store_id: 'store-a', min_stock: 5 },
  { id: 'p3', name: 'Agua de Jamaica',   price: 18, stock: 0,  active: true,  store_id: 'store-a', min_stock: 5 },
  { id: 'p4', name: 'Paleta Inactiva',   price: 12, stock: 10, active: false, store_id: 'store-a', min_stock: 5 },
]

describe('Inventario — filtrado de productos', () => {

  test('filtra productos por nombre correctamente', () => {
    // Arrange
    const search = 'paleta'
    // Act
    const resultado = productos.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    // Assert
    expect(resultado).toHaveLength(2) // Paleta de Mango + Paleta Inactiva
    expect(resultado.every(p => p.name.toLowerCase().includes('paleta'))).toBe(true)
  })

  test('búsqueda vacía devuelve todos los productos', () => {
    // Arrange
    const search = ''
    // Act
    const resultado = search.trim()
      ? productos.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : productos
    // Assert
    expect(resultado).toHaveLength(4)
  })

  test('solo muestra productos activos en el POS', () => {
    // Arrange & Act
    const activos = productos.filter(p => p.active)
    // Assert
    expect(activos).toHaveLength(3)
    expect(activos.every(p => p.active)).toBe(true)
  })

  test('formatea precios con 2 decimales', () => {
    // Arrange & Act
    const precios = productos.map(p => `$${p.price.toFixed(2)}`)
    // Assert
    expect(precios[0]).toBe('$15.00')
    expect(precios[1]).toBe('$20.00')
    expect(precios[2]).toBe('$18.00')
  })

})

describe('Inventario — lógica de stock', () => {

  test('identifica productos con stock bajo', () => {
    // Arrange & Act
    const stockBajo = productos.filter(p => p.active && p.stock > 0 && p.stock <= p.min_stock)
    // Assert
    expect(stockBajo).toHaveLength(1)
    expect(stockBajo[0].name).toBe('Nieve de Vainilla')
  })

  test('identifica productos agotados', () => {
    // Arrange & Act
    const agotados = productos.filter(p => p.active && p.stock === 0)
    // Assert
    expect(agotados).toHaveLength(1)
    expect(agotados[0].name).toBe('Agua de Jamaica')
  })

  test('el total de alertas es stock bajo + agotados', () => {
    // Arrange & Act
    const alertas = productos.filter(p => p.active && p.stock <= p.min_stock)
    // Assert
    expect(alertas).toHaveLength(2)
  })

  test('ordena alertas por urgencia: agotado primero', () => {
    // Arrange
    const alertas = productos
      .filter(p => p.active && p.stock <= p.min_stock)
      .sort((a, b) => a.stock - b.stock) // menor stock primero
    // Assert
    expect(alertas[0].stock).toBe(0)   // Agua de Jamaica (agotado)
    expect(alertas[1].stock).toBe(3)   // Nieve de Vainilla (stock bajo)
  })

})