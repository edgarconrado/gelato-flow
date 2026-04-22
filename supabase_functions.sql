-- ============================================================
-- Supabase RPC: decrement_stock
-- Llamar desde el cliente después de registrar una venta
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(stock - p_quantity, 0)
  WHERE id = p_product_id
    AND store_id = my_store_id();
END;
$$;

-- ============================================================
-- Vista útil: Reporte de ventas por día (para analítica avanzada)
-- ============================================================
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  store_id,
  DATE(created_at AT TIME ZONE 'America/Mexico_City') AS sale_date,
  COUNT(*)           AS total_sales,
  SUM(total)         AS total_revenue,
  AVG(total)         AS avg_ticket
FROM sales
GROUP BY store_id, DATE(created_at AT TIME ZONE 'America/Mexico_City');

-- Solo los usuarios de la tienda pueden ver su resumen
ALTER VIEW daily_sales_summary SET (security_invoker = TRUE);
