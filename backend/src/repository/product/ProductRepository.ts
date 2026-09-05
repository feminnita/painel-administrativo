import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '../../config/db';
import { products, productsSkus, productsColors, productColorImages, productCategories, categories } from '../../config/db/schema';
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

        // ADITIVO: o save só INSERE/ATUALIZA variações — NUNCA apaga SKU aqui.
        // Apagar variação é ação explícita na lista (lixeira → DELETE /skus/:id),
        // com confirmação própria e guarda de "com pedido → desativa". Tirar cor/
        // tamanho da "Definição de variações" NÃO remove SKU; salvar foto de capa,
        // preço, nome etc. não toca em variação. (Apagar SKU levaria junto o vínculo
        // com o Bling que a reconciliação usa pra religar os 3.296 SKUs do backup.)
        for (const item of skus) {
            // stockQty NUNCA é gravado pelo painel: fonte é o StockHub.
            await tx
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
                });
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

        // AUTOSSUFICIENTE: sincroniza product_categories = FOLHA + ANCESTRAIS a partir
        // do category_id salvo (a loja filtra por essa M:N). O form grava a FOLHA em
        // category_id; aqui montamos a cadeia até a raiz pra a página da folha E a do
        // departamento mostrarem o produto — assim o recadastro reflete na loja e não
        // deixa produto "solto no pai". Só quando category_id está setado: se vier null
        // (edição incompleta), NÃO mexe nos vínculos (preserva a classificação).
        const leafCategoryId = (safeProduct as ProductInsert).categoryId ?? null;
        if (leafCategoryId) {
            const chain: string[] = [];
            const seen = new Set<string>();
            let cur: string | null = leafCategoryId;
            while (cur && !seen.has(cur)) {
                seen.add(cur);
                chain.push(cur);
                const [parent] = await tx
                    .select({ parentId: categories.parentId })
                    .from(categories)
                    .where(eq(categories.id, cur));
                cur = parent?.parentId ?? null;
            }
            await tx.delete(productCategories).where(eq(productCategories.productId, savedId));
            for (const categoryId of chain) {
                await tx.insert(productCategories).values({ productId: savedId, categoryId });
            }
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
