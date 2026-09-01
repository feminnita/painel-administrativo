import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { productsSkus } from '../../config/db/schema';

type ProductSkuInsert = typeof productsSkus.$inferInsert;

export function findByProductId(productId: string) {
    return db.query.productsSkus.findMany({ where: eq(productsSkus.productId, productId) });
}

export async function insert(values: ProductSkuInsert) {
    const [sku] = await db.insert(productsSkus).values(values).returning();
    return sku;
}

export async function update(id: string, values: Partial<ProductSkuInsert>) {
    const [sku] = await db
        .update(productsSkus)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(productsSkus.id, id))
        .returning();
    return sku;
}

export async function remove(id: string) {
    const [sku] = await db.delete(productsSkus).where(eq(productsSkus.id, id)).returning();
    return sku;
}
