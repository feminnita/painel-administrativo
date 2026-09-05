import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '../../config/db';
import { products, productsSkus, productsColors, productColorImages, orderItems } from '../../config/db/schema';
import { normalizeSize } from '../../domain/product/size';

// Coerção defensiva: colunas timestamp do drizzle chamam value.toISOString() na
// serialização — uma STRING de data crua estoura "value.toISOString is not a
// function" e derruba TODO o save. Aqui garantimos Date-ou-null antes de gravar,
// independentemente de o controller/service terem normalizado.
function toDateOrNull(v: unknown): Date | null {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? null : d;
}

type ProductInsert = typeof products.$inferInsert;
type SkuGridItem = {
    size: string;
    color: string | null;
    price?: string | null;
    salePrice?: string | null;
    saleStart?: Date | null;
    saleEnd?: Date | null;
    reference?: string | null;
    minStock?: number | null;
    active?: boolean;
};
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
    // Datas do produto coagidas a Date|null (sem clobber de chave ausente).
    const safeProduct: Record<string, unknown> = { ...productValues };
    if ('saleStart' in safeProduct) safeProduct.saleStart = toDateOrNull(safeProduct.saleStart);
    if ('saleEnd' in safeProduct) safeProduct.saleEnd = toDateOrNull(safeProduct.saleEnd);

    return db.transaction(async (tx) => {

        let savedId: string;
        if (productId) {
            const [updated] = await tx
                .update(products)
                .set({ ...(safeProduct as ProductInsert), updatedAt: new Date() })
                .where(eq(products.id, productId))
                .returning({ id: products.id });
            if (!updated) throw new Error('PRODUCT_NOT_FOUND');
            savedId = updated.id;
        } else {
            const [created] = await tx.insert(products).values(safeProduct as ProductInsert).returning({ id: products.id });
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
            // stockQty NUNCA e gravado pelo painel: fonte e o StockHub. Novos SKUs
            // nascem com o default 0 e o upsert nunca toca stock_qty.
            const [row] = await tx
                .insert(productsSkus)
                .values({
                    productId: savedId,
                    size: normalizeSize(item.size),
                    colorId: item.color ? colorIdByName.get(item.color)! : null,
                    price: item.price ?? null,
                    salePrice: item.salePrice ?? null,
                    saleStart: toDateOrNull(item.saleStart),
                    saleEnd: toDateOrNull(item.saleEnd),
                    reference: item.reference ?? null,
                    minStock: item.minStock ?? 0,
                    active: item.active ?? true,
                })
                .onConflictDoUpdate({
                    target: [productsSkus.productId, productsSkus.size, productsSkus.colorId],
                    set: {
                        price: item.price ?? null,
                        salePrice: item.salePrice ?? null,
                        saleStart: toDateOrNull(item.saleStart),
                        saleEnd: toDateOrNull(item.saleEnd),
                        reference: item.reference ?? null,
                        minStock: item.minStock ?? 0,
                        active: item.active ?? true,
                        updatedAt: new Date(),
                    },
                })
                .returning({ id: productsSkus.id });
            keptSkuIds.push(row.id);
        }
        // Variacoes retiradas da grade: com pedido -> desativa (historico intacto);
        // sem pedido -> apaga. Nunca apaga cego.
        const removedSkus = await tx.query.productsSkus.findMany({
            where: and(
                eq(productsSkus.productId, savedId),
                keptSkuIds.length ? notInArray(productsSkus.id, keptSkuIds) : undefined,
            ),
        });
        for (const orphan of removedSkus) {
            const [used] = await tx
                .select({ id: orderItems.id })
                .from(orderItems)
                .where(eq(orderItems.skuId, orphan.id))
                .limit(1);
            if (used) {
                await tx
                    .update(productsSkus)
                    .set({ active: false, updatedAt: new Date() })
                    .where(eq(productsSkus.id, orphan.id));
            } else {
                await tx.delete(productsSkus).where(eq(productsSkus.id, orphan.id));
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
                keptColorIds.length ? notInArray(productColorImages.colorId, keptColorIds) : undefined,
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
