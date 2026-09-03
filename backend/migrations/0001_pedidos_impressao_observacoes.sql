-- Migration ADITIVA (nao destrutiva) — tela de PEDIDOS: flag de ja-impresso +
-- observacoes internas. NAO roda automaticamente. Aplicar manualmente em prod.
-- Compat: usa IF NOT EXISTS para ser idempotente.

-- 1) Flag de "ja impresso" no romaneio (carimbo, sem efeito em estoque/situacao)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_by text;

-- 2) Observacoes internas do pedido (append-only, com autor + data/hora)
CREATE TABLE IF NOT EXISTS order_notes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    author     text NOT NULL,
    body       text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_notes_order_id_idx ON order_notes(order_id);

-- Rastreio do Melhor Envio (tracking_code / tracking_url) JA EXISTEM na tabela
-- orders (colunas tracking_code, tracking_url) — nenhuma alteracao necessaria.
