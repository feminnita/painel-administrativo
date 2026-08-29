ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS ean text;
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 0;
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS sale_start text;
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS sale_end text;
ALTER TABLE products_skus ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
