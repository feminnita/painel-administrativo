import { eq, asc, desc, countDistinct } from 'drizzle-orm';
import { db } from '../../config/db';
import { productsColors, productsSkus } from '../../config/db/schema';

type ProductColorInsert = typeof productsColors.$inferInsert;

export function findAll() {
    return db.query.productsColors.findMany();
}

export function findAllWithUsage() {
    const usage = countDistinct(productsSkus.productId);
    return db
        .select({
            id: productsColors.id,
            name: productsColors.name,
            imageUrl: productsColors.imageUrl,
            usage,
        })
        .from(productsColors)
        .leftJoin(productsSkus, eq(productsSkus.colorId, productsColors.id))
        .groupBy(productsColors.id, productsColors.name, productsColors.imageUrl)
        .orderBy(desc(usage), asc(productsColors.name));
}

export function findById(id: string) {
    return db.query.productsColors.findFirst({ where: eq(productsColors.id, id) });
}

export async function insert(values: ProductColorInsert) {
    const [color] = await db.insert(productsColors).values(values).returning();
    return color;
}

export async function update(id: string, values: Partial<ProductColorInsert>) {
    const [color] = await db.update(productsColors).set(values).where(eq(productsColors.id, id)).returning();
    return color;
}

export async function remove(id: string) {
    const [color] = await db.delete(productsColors).where(eq(productsColors.id, id)).returning();
    return color;
}
