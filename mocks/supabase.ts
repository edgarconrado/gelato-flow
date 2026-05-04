// __mocks__/supabase.ts
// Mock completo de Supabase — las pruebas no hacen requests reales

export const mockProducts = [
    { id: 'prod-1', name: 'Paleta de Mango', price: 15, stock: 50, store_id: 'store-a', active: true, category_id: 'cat-1', type: 'paleta', min_stock: 5 },
    { id: 'prod-2', name: 'Nieve de Vainilla', price: 20, stock: 30, store_id: 'store-a', active: true, category_id: 'cat-2', type: 'nieve', min_stock: 5 },
    { id: 'prod-3', name: 'Agua de Jamaica', price: 18, stock: 40, store_id: 'store-a', active: true, category_id: 'cat-3', type: 'agua', min_stock: 5 },
    { id: 'prod-4', name: 'Paleta Otra Tienda', price: 12, stock: 20, store_id: 'store-b', active: true, category_id: 'cat-1', type: 'paleta', min_stock: 5 },
]

export const mockCategories = [
    { id: 'cat-1', name: 'Paletas', emoji: '🍡', sort_order: 1, store_id: 'store-a' },
    { id: 'cat-2', name: 'Nieves', emoji: '🍨', sort_order: 2, store_id: 'store-a' },
    { id: 'cat-3', name: 'Aguas', emoji: '💧', sort_order: 3, store_id: 'store-a' },
]

export const mockProfile = {
    id: 'user-1', email: 'cajero@test.com', full_name: 'Juan Test',
    role: 'cashier', store_id: 'store-a', avatar_url: null,
    store: { id: 'store-a', name: 'Paletería Demo', address: null, phone: null },
}

// Builder de query mock — encadena métodos como Supabase real
const buildQueryMock = (data: any, error: any = null) => {
    const q: any = {
        data, error,
        select: () => q,
        eq: () => q,
        neq: () => q,
        gte: () => q,
        lte: () => q,
        order: () => q,
        limit: () => q,
        single: () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error }),
        maybeSingle: () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error }),
        insert: () => Promise.resolve({ data, error }),
        update: () => q,
        delete: () => q,
        then: (fn: any) => Promise.resolve({ data, error }).then(fn),
    }
    return q
}

// Mock del cliente Supabase
export const supabase = {
    from: jest.fn((table: string) => {
        if (table === 'products') return buildQueryMock(mockProducts)
        if (table === 'categories') return buildQueryMock(mockCategories)
        if (table === 'profiles') return buildQueryMock(mockProfile)
        if (table === 'sales') return buildQueryMock([])
        if (table === 'expenses') return buildQueryMock([])
        return buildQueryMock([])
    }),
    auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
        updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    storage: {
        from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ error: null }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } }),
        }),
    },
    channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
    }),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: { ok: true }, error: null }),
}