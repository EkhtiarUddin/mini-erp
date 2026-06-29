-- ============================================================
-- MINI ERP SYSTEM — COMPLETE SCHEMA WITH DATA
-- ============================================================

-- Drop existing tables
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.purchase_items CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_product_stock(UUID, INTEGER);

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 2. PRODUCTS
-- ============================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  total_purchases NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. SUPPLIERS
-- ============================================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  total_supplied NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. PURCHASES
-- ============================================================
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  notes TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select" ON public.purchases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "purchases_update" ON public.purchases FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "purchases_delete" ON public.purchases FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. PURCHASE ITEMS
-- ============================================================
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_items_select" ON public.purchase_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "purchase_items_insert" ON public.purchase_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "purchase_items_update" ON public.purchase_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "purchase_items_delete" ON public.purchase_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 7. SALES
-- ============================================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax NUMERIC(5,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','unpaid','cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select" ON public.sales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_insert" ON public.sales FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sales_update" ON public.sales FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_delete" ON public.sales FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. SALE ITEMS
-- ============================================================
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity + p_quantity_change),
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX idx_purchase_items_pur ON public.purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_prod ON public.purchase_items(product_id);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_invoice ON public.sales(invoice_number);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_prod ON public.sale_items(product_id);

-- ============================================================
-- 11. SEED DATA WITH REAL VALUES
-- ============================================================

-- Products
INSERT INTO public.products (name, sku, category, unit_price, cost_price, stock_quantity, min_stock_level, unit, description)
VALUES
  ('Laptop Pro 15"', 'LAP-0001', 'Electronics', 1299.99, 950.00, 25, 5, 'pcs', 'High-performance laptop with 16GB RAM'),
  ('Wireless Mouse', 'MOU-0002', 'Electronics', 29.99, 12.00, 150, 20, 'pcs', 'Ergonomic wireless mouse'),
  ('Office Chair', 'CHR-0003', 'Furniture', 299.99, 180.00, 8, 10, 'pcs', 'Ergonomic office chair'),
  ('A4 Paper Ream', 'PAP-0004', 'Office Supplies', 8.99, 4.50, 200, 50, 'box', '500 sheets per ream'),
  ('USB-C Hub', 'USB-0005', 'Electronics', 49.99, 22.00, 0, 10, 'pcs', '7-in-1 USB-C hub'),
  ('Monitor 27" 4K', 'MON-0007', 'Electronics', 449.99, 310.00, 18, 5, 'pcs', '4K IPS display'),
  ('Mechanical Keyboard', 'KEY-0008', 'Electronics', 89.99, 45.00, 5, 10, 'pcs', 'RGB mechanical keyboard'),
  ('Standing Desk', 'DSK-0006', 'Furniture', 599.99, 380.00, 4, 2, 'pcs', 'Adjustable standing desk'),
  ('Notebook Pack', 'NOT-0009', 'Office Supplies', 12.99, 6.00, 300, 50, 'set', 'Pack of 5 notebooks'),
  ('Water Bottle', 'BOT-0010', 'Accessories', 19.99, 8.00, 75, 15, 'pcs', 'Insulated water bottle')
ON CONFLICT (sku) DO NOTHING;

-- Suppliers
INSERT INTO public.suppliers (name, email, phone, contact_person, total_supplied)
VALUES
  ('TechWorld Supplies', 'orders@techworld.com', '+1-555-0101', 'John Smith', 4520.00),
  ('Office Pro Ltd', 'supply@officepro.com', '+1-555-0102', 'Sarah Johnson', 1720.00),
  ('Global Furniture Co', 'info@globalfurniture.com', '+1-555-0103', 'Mike Wilson', 2800.00),
  ('ElectroParts Inc', 'sales@electroparts.com', '+1-555-0104', 'Emily Chen', 1650.00)
ON CONFLICT DO NOTHING;

-- Customers
INSERT INTO public.customers (name, email, phone, city, total_purchases)
VALUES
  ('Acme Corporation', 'acme@example.com', '+1-555-1001', 'New York', 1250.50),
  ('Bright Solutions', 'bright@example.com', '+1-555-1002', 'Los Angeles', 430.00),
  ('Crystal Ventures', 'crystal@example.com', '+1-555-1003', 'Chicago', 741.24),
  ('Dynamic Enterprises', 'dynamic@example.com', '+1-555-1004', 'Houston', 560.00),
  ('Eagle Logistics', 'eagle@example.com', '+1-555-1005', 'Miami', 920.75)
ON CONFLICT DO NOTHING;
