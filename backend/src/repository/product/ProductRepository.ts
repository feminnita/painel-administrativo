import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { products, productsSkus, productsColors, productColorImages } from '../../config/db/schema';

type ProductInsert = typeof products.$inferInsert;
type SkuGridItem = {
    size: string;
    color: string | null;
    stockQty: number;
    price?: string | null;
    salePrice?: string | null;
    costPrice?: string | null;
    reference?: string | null;
    ean?: string | null;
    minStock?: number;
    saleStart?: string | null;
    saleEnd?: string | null;
    active?: boolean;
    availability?: string | null;
    outOfStockAction?: string | null;
    weightG?: number | null;
    heightCm?: string | null;
    widthCm?: string | null;
    lengthCm?: string | null;
    position?: number | null;
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
    deletedSkuIds: string[] = [],
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
                    stockQty: 0, // FASE A: estoque vem do Bling; o cadastro NÃO grava estoque
                    price: item.price ?? null,
                    salePrice: item.salePrice ?? null,
                    costPrice: item.costPrice ?? null,
                    reference: item.reference ?? null,
                    ean: item.ean ?? null,
                    minStock: item.minStock ?? 0,
                    saleStart: item.saleStart ?? null,
                    saleEnd: item.saleEnd ?? null,
                    active: item.active ?? true,
                    availability: item.availability ?? null,
                    outOfStockAction: item.outOfStockAction ?? null,
                    weightG: item.weightG ?? null,
                    heightCm: item.heightCm ?? null,
                    widthCm: item.widthCm ?? null,
                    lengthCm: item.lengthCm ?? null,
                    position: item.position ?? null,
                })
                .onConflictDoUpdate({
                    target: [productsSkus.productId, productsSkus.size, productsSkus.colorId],
                    set: {
                        // FASE A: estoque NÃO é atualizado pelo cadastro (fonte única = Bling)
                        price: item.price ?? null,
                        salePrice: item.salePrice ?? null,
                        costPrice: item.costPrice ?? null,
                        reference: item.reference ?? null,
                        ean: item.ean ?? null,
                        minStock: item.minStock ?? 0,
                        saleStart: item.saleStart ?? null,
                        saleEnd: item.saleEnd ?? null,
                        active: item.active ?? true,
                        availability: item.availability ?? null,
                        outOfStockAction: item.outOfStockAction ?? null,
                        weightG: item.weightG ?? null,
                        heightCm: item.heightCm ?? null,
                        widthCm: item.widthCm ?? null,
                        lengthCm: item.lengthCm ?? null,
                        position: item.position ?? null,
                        updatedAt: new Date(),
                    },
                })
                .returning({ id: productsSkus.id });
            keptSkuIds.push(row.id);
        }
        // ⛔ REGRA PERMANENTE: o SAVE NUNCA apaga variação por ausência no payload.
        // Só faz upsert do que veio (acima); o que não veio fica INTOCADO no banco.
        // Exclusão de variação só por ação EXPLÍCITA do usuário (lixeira do card) →
        // vem em `deletedSkuIds` e apaga SOMENTE o que está nessa lista.
        if (deletedSkuIds.length) {
            await tx.delete(productsSkus).where(and(
                eq(productsSkus.productId, savedId),
                inArray(productsSkus.id, deletedSkuIds),
            ));
        }

        // Imagens por cor: upsert do que veio; NUNCA apaga as que não vieram.
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
