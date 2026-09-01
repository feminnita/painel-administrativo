import { eq, sql, isNotNull } from 'drizzle-orm';
import { db } from '../../config/db';
import { categories, products } from '../../config/db/schema';

type CategoryInsert = typeof categories.$inferInsert;

export function findAll() {
    return db.query.categories.findMany();
}

export function findById(id: string) {
    return db.query.categories.findFirst({ where: eq(categories.id, id) });
}

export async function insert(values: CategoryInsert) {
    const [category] = await db.insert(categories).values(values).returning();
    return category;
}

export async function update(id: string, values: Partial<CategoryInsert>) {
    const [category] = await db.update(categories).set(values).where(eq(categories.id, id)).returning();
    return category;
}

export async function deactivate(id: string) {
    const [category] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return category;
}

export async function countProductsByCategory() {
    const rows = await db
        .select({ categoryId: products.categoryId, count: sql<number>`count(*)::int` })
        .from(products)
        .where(isNotNull(products.categoryId))
        .groupBy(products.categoryId)

    return Object.fromEntries(rows.map((r) => [r.categoryId!, r.count]));
}

export function reorderCategories(updates: { id: string; orderIndex: number }[]) {
    return db.transaction(async (tx) => {
        for (const { id, orderIndex } of updates) {
            await tx.update(categories).set({ orderIndex }).where(eq(categories.id, id));
        }
    });
}

export async function remove(id: string) {
    const [category] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return category;
}