# 🍦 Paletería App — React Native + Expo + Supabase

App móvil de gestión de ventas para una red de paleterías y neverías.
Multi-tenant, con POS, inventario y reportes de analítica.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React Native + Expo Router v3 |
| Estado | Zustand |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | StyleSheet (React Native nativo) |
| Íconos | @expo/vector-icons (Ionicons) |

---

## Estructura del Proyecto

```
paleteria-app/
├── app/
│   ├── _layout.tsx          # Root layout + auth guard
│   ├── auth/
│   │   └── login.tsx        # Pantalla de login
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Punto de Venta (POS)
│   │   ├── inventory.tsx    # Gestión de Inventario
│   │   ├── reports.tsx      # Reportes / Analítica
│   │   └── profile.tsx      # Perfil de usuario
│   ├── pos/
│   │   └── checkout.tsx     # Modal de cobro
│   └── inventory/
│       └── form.tsx         # Modal crear/editar producto
├── components/              # Componentes reutilizables (puedes agregar)
├── constants/
│   └── theme.ts             # Tokens de diseño (colores, radios)
├── hooks/
│   └── useData.ts           # useProducts, useSalesReport
├── lib/
│   └── supabase.ts          # Cliente Supabase + Types
├── store/
│   └── index.ts             # Zustand: Auth + Cart
├── supabase_schema.sql      # DDL completo con RLS
├── supabase_functions.sql   # RPCs y vistas
└── .env.example             # Variables de entorno
```

---

## Setup

### 1. Clonar e instalar

```bash
git clone <tu-repo>
cd paleteria-app
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta en orden:
   - `supabase_schema.sql`
   - `supabase_functions.sql`
3. Copia tus credenciales desde **Settings → API**

### 3. Variables de entorno

```bash
cp .env.example .env
# Edita .env con tu URL y ANON_KEY de Supabase
```

### 4. Correr la app

```bash
npx expo start
# Escanea el QR con Expo Go o usa un emulador
```

---

## Modelo Multi-Tenant

Cada registro de negocio tiene `store_id`. Las políticas RLS de Supabase garantizan que:

- Un cajero solo lee datos de **su tienda**
- Solo managers/owners pueden crear o editar productos
- Solo owners pueden desactivar productos

### Crear un usuario para una tienda

```sql
-- En Supabase → Authentication → Users → Invite user
-- Los metadatos del usuario controlan su tienda y rol:
{
  "store_id": "11111111-1111-1111-1111-111111111111",
  "role": "manager"
}
```

---

## Flujo de una Venta

```
1. Cajero selecciona productos → addItem() en CartStore
2. Abre modal de Checkout
3. Selecciona método de pago (efectivo / tarjeta / transferencia)
4. checkout() → INSERT into sales + sale_items
5. decrement_stock() RPC reduce el inventario
6. Carrito se vacía, venta registrada ✅
```

---

## Roles

| Rol | POS | Ver Inventario | Editar Inventario | Ver Reportes |
|---|:---:|:---:|:---:|:---:|
| `cashier` | ✅ | ✅ | ❌ | ✅ |
| `manager` | ✅ | ✅ | ✅ | ✅ |
| `owner`   | ✅ | ✅ | ✅ | ✅ |

---

## Próximos Pasos Sugeridos

- [ ] Agregar imagen de producto (Supabase Storage)
- [ ] Modo offline con sincronización (MMKV + background sync)
- [ ] Dashboard web para el dueño (Next.js + mismo Supabase)
- [ ] Exportar reporte a PDF/Excel
- [ ] Notificaciones push cuando el stock esté bajo
- [ ] Soporte para múltiples impresoras térmicas (Bluetooth)
