import { sql } from 'drizzle-orm';
import { db } from '../../config/db';

export type SkuRow = {
    sku_id: string;
    bling_id: string | null;
    tamanho: string;
    produto_codigo: string | null;
    cor: string | null;
};

export type BackupRow = {
    produto_codigo: string | null;
    tamanho: string;
    cor: string | null;
    bling_id: string;
};

// SKUs do site com o produto (code) e a cor (name) resolvidos para montar a chave
// de reconciliação (produto_codigo|tamanho|cor). bling_id vem como texto para
// preservar a precisão do bigint (IDs longos estouram o Number do JS).
export async function fetchSkuRows(): Promise<SkuRow[]> {
    const { rows } = await db.execute<SkuRow>(sql`
        SELECT
            s.id::text        AS sku_id,
            s.bling_id::text  AS bling_id,
            s.size            AS tamanho,
            p.code            AS produto_codigo,
            c.name            AS cor
        FROM products_skus s
        JOIN products p ON p.id = s.product_id
        LEFT JOIN products_colors c ON c.id = s.color_id
    `);
    return rows;
}

// Retrato do vínculo ATUAL (só SKUs que já têm bling_id) para virar o novo
// snapshot em site_settings.bling_id_backup.
export async function fetchCurrentBinding(): Promise<BackupRow[]> {
    const { rows } = await db.execute<BackupRow>(sql`
        SELECT
            p.code            AS produto_codigo,
            s.size            AS tamanho,
            c.name            AS cor,
            s.bling_id::text  AS bling_id
        FROM products_skus s
        JOIN products p ON p.id = s.product_id
        LEFT JOIN products_colors c ON c.id = s.color_id
        WHERE s.bling_id IS NOT NULL
    `);
    return rows;
}

// Guarda TRIPLA: só grava se o SKU ainda está sem vínculo E se esse bling_id
// não está em uso por nenhum SKU. Aditivo — nunca sobrescreve. Retorna quantas
// linhas foram realmente gravadas (0 ou 1).
export async function applyBinding(skuId: string, blingId: string): Promise<number> {
    const result = await db.execute(sql`
        UPDATE products_skus
        SET bling_id = ${blingId}::bigint, updated_at = now()
        WHERE id = ${skuId}::uuid
          AND bling_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM products_skus x WHERE x.bling_id = ${blingId}::bigint
          )
    `);
    return result.rowCount ?? 0;
}
