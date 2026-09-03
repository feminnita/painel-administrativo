import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { productsSkus } from '../../config/db/schema';
import { normalizeSize } from '../../domain/product/size';

type ProductSkuInsert = typeof productsSkus.$inferInsert;

export function findByProductId(productId: string) {
    return db.query.productsSkus.findMany({ where: eq(productsSkus.productId, productId) });
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
