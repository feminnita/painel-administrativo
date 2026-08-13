import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { productsColors } from '../../config/db/schema';

type ProductColorInsert = typeof productsColors.$inferInsert;

export function findAll() {
    return db.query.productsColors.findMany();
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
