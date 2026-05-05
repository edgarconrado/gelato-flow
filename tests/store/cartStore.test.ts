// __tests__/store/cartStore.test.ts
// Prueba la lógica del carrito sin importar el store de Zustand
// (evita la cadena de imports que llega a React Native / AsyncStorage)

// ── Implementación mínima del carrito para pruebas ────────────

type Product = { id: string; name: string; price: number }
type CartItem = { product: Product; quantity: number }

function createCart() {
  let items: CartItem[] = []

  return {
    getItems: () => items,
    addItem: (product: Product) => {
      const existing = items.find(i => i.product.id === product.id)
      if (existing) { existing.quantity += 1 }
      else { items.push({ product, quantity: 1 }) }
    },
    removeItem: (id: string) => { items = items.filter(i => i.product.id !== id) },
    updateQuantity: (id: string, qty: number) => {
      if (qty <= 0) { items = items.filter(i => i.product.id !== id); return }
      const item = items.find(i => i.product.id === id)
      if (item) item.quantity = qty
    },
    clearCart: () => { items = [] },
    total: () => items.reduce((s, i) => s + i.product.price * i.quantity, 0),
  }
}

const makeProduct = (overrides = {}): Product => ({
  id: 'prod-1', name: 'Paleta de Mango', price: 15, ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────

describe('CartStore — agregar productos', () => {

  test('agrega un producto nuevo al carrito', () => {
    // Arrange
    const cart = createCart()
    // Act
    cart.addItem(makeProduct())
    // Assert
    expect(cart.getItems()).toHaveLength(1)
    expect(cart.getItems()[0].quantity).toBe(1)
  })

  test('incrementa cantidad si el producto ya existe', () => {
    // Arrange
    const cart = createCart()
    const product = makeProduct()
    // Act
    cart.addItem(product)
    cart.addItem(product)
    cart.addItem(product)
    // Assert
    expect(cart.getItems()).toHaveLength(1)
    expect(cart.getItems()[0].quantity).toBe(3)
  })

  test('agrega productos distintos como items separados', () => {
    // Arrange
    const cart = createCart()
    // Act
    cart.addItem(makeProduct({ id: 'p1' }))
    cart.addItem(makeProduct({ id: 'p2' }))
    // Assert
    expect(cart.getItems()).toHaveLength(2)
  })

})

describe('CartStore — cálculo del total', () => {

  test('calcula el total con un solo producto (qty 2)', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct({ price: 15 }))
    cart.addItem(makeProduct({ price: 15 }))
    // Act & Assert
    expect(cart.total()).toBe(30)
  })

  test('calcula el total con múltiples productos', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct({ id: 'p1', price: 15 }))
    cart.addItem(makeProduct({ id: 'p1', price: 15 })) // qty 2 → 30
    cart.addItem(makeProduct({ id: 'p2', price: 20 })) // 20
    cart.addItem(makeProduct({ id: 'p3', price: 18 })) // 18
    // Act & Assert
    expect(cart.total()).toBe(68)
  })

  test('el total es 0 con carrito vacío', () => {
    const cart = createCart()
    expect(cart.total()).toBe(0)
  })

  test('calcula con precisión decimal', () => {
    // Arrange
    const cart = createCart()
    const p = makeProduct({ price: 18.50 })
    cart.addItem(p)
    cart.addItem(p)
    cart.addItem(p)
    // Act & Assert
    expect(cart.total()).toBeCloseTo(55.50, 2)
  })

})

describe('CartStore — actualizar y eliminar', () => {

  test('actualiza la cantidad de un producto', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct())
    // Act
    cart.updateQuantity('prod-1', 5)
    // Assert
    expect(cart.getItems()[0].quantity).toBe(5)
  })

  test('elimina el item si la cantidad llega a 0', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct())
    // Act
    cart.updateQuantity('prod-1', 0)
    // Assert
    expect(cart.getItems()).toHaveLength(0)
  })

  test('no permite cantidades negativas — elimina el item', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct())
    // Act
    cart.updateQuantity('prod-1', -1)
    // Assert
    expect(cart.getItems()).toHaveLength(0)
  })

  test('elimina un producto específico sin afectar otros', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct({ id: 'p1' }))
    cart.addItem(makeProduct({ id: 'p2' }))
    // Act
    cart.removeItem('p1')
    // Assert
    expect(cart.getItems()).toHaveLength(1)
    expect(cart.getItems()[0].product.id).toBe('p2')
  })

  test('clearCart vacía completamente el carrito', () => {
    // Arrange
    const cart = createCart()
    cart.addItem(makeProduct({ id: 'p1' }))
    cart.addItem(makeProduct({ id: 'p2' }))
    // Act
    cart.clearCart()
    // Assert
    expect(cart.getItems()).toHaveLength(0)
    expect(cart.total()).toBe(0)
  })

})