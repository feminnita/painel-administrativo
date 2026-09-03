import { eq, inArray } from 'drizzle-orm';
import { db } from '../../config/db';
import { productsSkus, orderItems } from '../../config/db/schema';
import { normalizeSize } from '../../domain/product/size';

type ProductSkuInsert = typeof productsSkus.$inferInsert;

export function findByProductId(productId: string) {
    return db.query.productsSkus.findMany({ where: eq(productsSkus.productId, productId) });
}

/** SKUs do produto com flag hasOrders (aparece em algum order_items). */
export async function findByProductIdWithOrders(productId: string) {
    const skus = await db.query.productsSkus.findMany({ where: eq(productsSkus.productId, productId) });
    if (skus.length === 0) return [];
    const usedRows = await db
        .select({ skuId: orderItems.skuId })
        .from(orderItems)
        .where(inArray(orderItems.skuId, skus.map((s) => s.id)));
    const used = new Set(usedRows.map((r) => r.skuId));
    return skus.map((s) => ({ ...s, hasOrders: used.has(s.id) }));
}

/** true se a variacao ja aparece em algum pedido (order_items). */
export async function hasOrders(skuId: string): Promise<boolean> {
    const [row] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.skuId, skuId))
        .limit(1);
    return Boolean(row);
}

/** Desativa a variacao (some da loja/filtro, para de vender, historico intacto). */
export async function deactivate(id: string) {
    const [sku] = await db
        .update(productsSkus)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(productsSkus.id, id))
        .returning();
    return sku;
}

export async function insert(values: ProductSkuInsert) {
    const [sku] = await db
        .insert(productsSkus)
        .values({ ...values, size: normalizeSize(values.size) })
        .returning();
    return sku;
}

export async function update(id: string, values: Partial<ProductSkuInsert>) {
    const patch = values.size !== undefined ? { ...values, size: normalizeSize(values.size) } : values;
    const [sku] = await db
        .update(productsSkus)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(productsSkus.id, id))
        .returning();
    return sku;
}

export async function remove(id: string) {
    const [sku] = await db.delete(productsSkus).where(eq(productsSkus.id, id)).returning();
    return sku;
}
