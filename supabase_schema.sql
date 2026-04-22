-- ============================================================
-- PALETERÍA & NEVERÍA — Supabase Schema
-- Multi-tenant con Row Level Security (RLS)
-- ============================================================

-- 1. STORES (Tiendas / Tenants)
CREATE TABLE stores (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  address   TEXT,
  phone     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES (Usuarios con rol y tienda)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'cashier')),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS (Inventario por tienda)
CREATE TABLE products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('nieve', 'paleta', 'malteada', 'agua', 'otro')),
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  image_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SALES (Ventas)
CREATE TABLE sales (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES profiles(id),
  total      NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALE_ITEMS (Detalle de cada venta)
CREATE TABLE sale_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id    UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal   NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, store_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'store_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at on products
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's store_id
CREATE OR REPLACE FUNCTION my_store_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid();
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- PROFILES policies
CREATE POLICY "profiles: read own store"
  ON profiles FOR SELECT
  USING (store_id = my_store_id());

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- PRODUCTS policies
CREATE POLICY "products: read own store"
  ON products FOR SELECT
  USING (store_id = my_store_id());

CREATE POLICY "products: insert own store (manager+)"
  ON products FOR INSERT
  WITH CHECK (store_id = my_store_id() AND my_role() IN ('owner', 'manager'));

CREATE POLICY "products: update own store (manager+)"
  ON products FOR UPDATE
  USING (store_id = my_store_id() AND my_role() IN ('owner', 'manager'));

CREATE POLICY "products: delete own store (owner)"
  ON products FOR DELETE
  USING (store_id = my_store_id() AND my_role() = 'owner');

-- SALES policies
CREATE POLICY "sales: read own store"
  ON sales FOR SELECT
  USING (store_id = my_store_id());

CREATE POLICY "sales: insert own store"
  ON sales FOR INSERT
  WITH CHECK (store_id = my_store_id());

-- SALE_ITEMS policies
CREATE POLICY "sale_items: read via sale"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.store_id = my_store_id()
    )
  );

CREATE POLICY "sale_items: insert via sale"
  ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.store_id = my_store_id()
    )
  );

-- ============================================================
-- SEED DATA (Demo)
-- ============================================================

INSERT INTO stores (id, name, address, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Paletería El Paraíso Centro', 'Av. Hidalgo 123, Guadalajara', '33-1234-5678'),
  ('22222222-2222-2222-2222-222222222222', 'Paletería El Paraíso Zapopan', 'Blvd. Patria 456, Zapopan', '33-8765-4321');
