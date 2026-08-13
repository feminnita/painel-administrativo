import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { products, productsSkus, productsColors, productColorImages } from '../../config/db/schema';

type ProductInsert = typeof products.$inferInsert;
type SkuGridItem = { size: string; color: string | null; stockQty: number };
type ColorImagesItem = { color: string; images: string[] };

export function findAll() {
    return db.query.products.findMany();
}

export function findById(id: string) {
    return db.query.products.findFirst({ where: eq(products.id, id) });
}

export async function update(id: string, values: Partial<ProductInsert>) {
    const [product] = await db
        .update(products)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
    return product;
}

export function setActiveMany(ids: string[], active: boolean) {
    return db.update(products).set({ active, updatedAt: new Date() }).where(inArray(products.id, ids));
}

export async function saveProductWithRelations(
    productValues: ProductInsert,
    skus: SkuGridItem[],
    colorImages: ColorImagesItem[],
    productId?: string,
) {
    return db.transaction(async (tx) => {

        let savedId: string;
        if (productId) {
            const [updated] = await tx
                .update(products)
                .set({ ...productValues, updatedAt: new Date() })
                .where(eq(products.id, productId))
                .returning({ id: products.id });
            if (!updated) throw new Error('PRODUCT_NOT_FOUND');
            savedId = updated.id;
        } else {
            const [created] = await tx.insert(products).values(productValues).returning({ id: products.id });
            savedId = created.id;
        }

        const colorNames = [
            ...new Set([
                ...skus.map((s) => s.color).filter((c): c is string => !!c),
                ...colorImages.map((c) => c.color),
            ]),
        ];
        const colorRows = colorNames.length
            ? await tx.select().from(productsColors).where(inArray(productsColors.name, colorNames))
            : [];
        const colorIdByName = new Map(colorRows.map((c) => [c.name, c.id]));
        for (const name of colorNames) {
            if (!colorIdByName.has(name)) throw new Error(`COLOR_NOT_REGISTERED:${name}`);
        }

        const keptSkuIds: string[] = [];
        for (const item of skus) {
            const [row] = await tx
                .insert(productsSkus)
                .values({
                    productId: savedId,
                    size: item.size,
                    colorId: item.color ? colorIdByName.get(item.color)! : null,
                    stockQty: item.stockQty,
                })
                .onConflictDoUpdate({
                    target: [productsSkus.productId, productsSkus.size, productsSkus.colorId],
                    set: { stockQty: item.stockQty, updatedAt: new Date() },
                })
                .returning({ id: productsSkus.id });
            keptSkuIds.push(row.id);
        }
        const removedSkus = await tx.query.productsSkus.findMany({
            where: and(
                eq(productsSkus.productId, savedId),
                keptSkuIds.length ? sql`${productsSkus.id} NOT IN ${keptSkuIds}` : undefined,
            ),
        });
        for (const orphan of removedSkus) {
            try {
                await tx.delete(productsSkus).where(eq(productsSkus.id, orphan.id));
            } catch {
                await tx
                    .update(productsSkus)
                    .set({ stockQty: 0, updatedAt: new Date() })
                    .where(eq(productsSkus.id, orphan.id));
            }
        }

        const keptColorIds = colorImages.map((c) => colorIdByName.get(c.color)!);
        for (const item of colorImages) {
            await tx
                .insert(productColorImages)
                .values({
                    productId: savedId,
                    colorId: colorIdByName.get(item.color)!,
                    images: item.images,
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: [productColorImages.productId, productColorImages.colorId],
                    set: { images: item.images, updatedAt: new Date() },
                });
        }
        await tx.delete(productColorImages).where(
            and(
                eq(productColorImages.productId, savedId),
                keptColorIds.length ? sql`${productColorImages.colorId} NOT IN ${keptColorIds}` : undefined,
            ),
        );

        return savedId;
    });
}

export async function deleteProductsCascade(ids: string[]) {
    await db.transaction(async (tx) => {
        await tx.delete(productColorImages).where(inArray(productColorImages.productId, ids));
        await tx.delete(productsSkus).where(inArray(productsSkus.productId, ids));
        await tx.delete(products).where(inArray(products.id, ids));
    });
}
