import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { blingSyncLog, categories, products, productsColors, productsSkus } from '../../config/db/schema';
import * as BlingApi from './BlingApi';
import * as BlingDomain from './BlingDomain';
import * as TokenService from './TokenService';
import type { BlingProductListItem, ParsedSku, SyncStepResult } from './types';

async function requireToken(): Promise<string> {
    const token = await TokenService.getAccessToken();
    if (!token) throw new Error('BLING_NOT_CONNECTED');
    return token;
}

const CATEGORY_CHAIN = [
    { name: 'Bling', slug: 'bling' },
    { name: 'Importados', slug: 'bling-importados' },
    { name: 'Aguardando classificação', slug: 'bling-aguardando-classificacao' },
];

async function ensureBlingCategory(): Promise<string> {
    let parentId: string | null = null;
    let lastId = '';

    for (const level of CATEGORY_CHAIN) {
        const existing = await db.query.categories.findFirst({
            where: eq(categories.slug, level.slug),
        });

        if (existing) {
            lastId = existing.id;
            parentId = existing.id;
            continue;
        }

        const [created]: { id: string }[] = await db
            .insert(categories)
            .values({ name: level.name, slug: level.slug, parentId, active: true })
            .returning({ id: categories.id });

        lastId = created.id;
        parentId = created.id;
    }

    return lastId;
}

async function resolveColorId(name: string): Promise<string> {
    const existing = await db.query.productsColors.findFirst({
        where: sql`lower(${productsColors.name}) = lower(${name})`,
    });
    if (existing) return existing.id;

    const [created]: { id: string }[] = await db
        .insert(productsColors)
        .values({ name, imageUrl: '' })
        .returning({ id: productsColors.id });

    return created.id;
}

async function syncSkuGrid(
    productId: string,
    skus: ParsedSku[],
    blingOwnsGrid: boolean,
): Promise<void> {

    const keptIds: string[] = [];

    for (const sku of skus) {
        if (!sku.size) continue;

        const colorId = sku.color ? await resolveColorId(sku.color) : null;

        const existing = await db.query.productsSkus.findFirst({
            where: and(
                eq(productsSkus.productId, productId),
                eq(productsSkus.size, sku.size),
                colorId ? eq(productsSkus.colorId, colorId) : isNull(productsSkus.colorId),
            ),
        });

        if (existing) {
            await db
                .update(productsSkus)
                .set({
                    stockQty: sku.stockQty,
                    blingId: sku.blingId,
                    updatedAt: new Date()
                })
                .where(eq(productsSkus.id, existing.id));
            keptIds.push(existing.id);
        } else {
            const [created]: { id: string }[] = await db
                .insert(productsSkus)
                .values({
                    productId,
                    size: sku.size,
                    colorId,
                    stockQty: sku.stockQty,
                    blingId: sku.blingId,
                })
                .returning({ id: productsSkus.id })
            keptIds.push(created.id);
        }
    }

    if (blingOwnsGrid) {
        const allSkus = await db.query.productsSkus.findMany({
            where: eq(productsSkus.productId, productId),
        });

        for (const row of allSkus) {
            if (keptIds.includes(row.id)) continue;

            if ((row.reservedQty ?? 0) > 0) {
                await db
                    .update(productsSkus)
                    .set({
                        stockQty: 0,
                        updatedAt: new Date()
                    })
                    .where(eq(productsSkus.id, row.id));
            } else {
                await db.delete(productsSkus).where(eq(productsSkus.id, row.id));
            }
        }
    }
}

async function upsertProductFromBling(
    token: string,
    item: BlingProductListItem,
    handledParents: Set<number>,
): Promise<'created' | 'updated' | 'skipped'> {
    const detail = await BlingApi.getProductDetail(token, String(item.id));
    if (!detail) return 'skipped';

    const parentId =
        item.idProdutoPai ??
        detail.idProdutoPai ??
        detail.variacao?.produtoPai?.id;

    if (parentId) {
        if (handledParents.has(parentId)) return 'skipped';
        handledParents.add(parentId);
        return upsertProductFromBling(token, { id: parentId }, handledParents);
    }

    handledParents.add(item.id);

    const parsed = BlingDomain.parseVariations(detail.variacoes);

    const skus: ParsedSku[] = parsed.skus.length
        ? parsed.skus
        : [
            {
                size: 'Único',
                color: '',
                skuCode: detail.codigo ?? item.codigo ?? '',
                stockQty: BlingDomain.sumStock(
                    await BlingApi.getProductStock(token, item.id),
                ),
                blingId: item.id,
            },
        ];

    const totalStock = skus.reduce((sum, s) => sum + s.stockQty, 0);
    const sizes = parsed.sizes.length ? parsed.sizes : ['Único'];

    const buildInput = {
        item,
        detail,
        stock: totalStock,
        colors: parsed.colors,
        sizes,
        categoryId: null as string | null,
    };

    const byBlingId = await db.query.products.findFirst({
        where: eq(products.blingId, item.id),
        columns: { id: true },
    });

    if (byBlingId) {
        await db
            .update(products)
            .set({ ...BlingDomain.buildUpdateValues(buildInput), updatedAt: new Date() })
            .where(eq(products.id, byBlingId.id));
        await syncSkuGrid(byBlingId.id, skus, parsed.skus.length > 0);
        return 'updated';
    }

    const code = detail.codigo || item.codigo || null;
    if (code) {
        const byCode = await db.query.products.findFirst({
            where: eq(products.code, code),
            columns: { id: true, blingId: true },
        });

        if (byCode) {
            await db
                .update(products)
                .set({ ...BlingDomain.buildUpdateValues(buildInput), updatedAt: new Date() })
                .where(eq(products.id, byCode.id));
            await syncSkuGrid(byCode.id, skus, parsed.skus.length > 0);
            return 'updated';
        }
    }

    buildInput.categoryId = await ensureBlingCategory();

    const [created]: { id: string }[] = await db
        .insert(products)
        .values(BlingDomain.buildInsertValues(buildInput))
        .returning({ id: products.id });

    await syncSkuGrid(created.id, skus, parsed.skus.length > 0);
    return 'created';
}

export async function findResumableSync(): Promise<{
    logId: string;
    nextPage: number;
} | null> {
    const row = await db.query.blingSyncLog.findFirst({
        where: eq(blingSyncLog.status, 'running'),
        orderBy: [desc(blingSyncLog.startedAt)],
    });

    if (!row) return null;

    return {
        logId: row.id,
        nextPage: Math.floor(row.productsSynced / BlingApi.BLING_SYNC_PAGE_SIZE) + 1,
    };
}

export async function getSyncLogs(limit = 5) {
    return db.query.blingSyncLog.findMany({
        orderBy: [desc(blingSyncLog.startedAt)],
        limit,
    });
}

export async function syncProductsPage(
    page: number,
    logId?: string,
): Promise<SyncStepResult> {
    const token = await requireToken();

    let currentLogId = logId;
    if (!currentLogId) {
        const [logEntry] = await db
            .insert(blingSyncLog)
            .values({ status: 'running' })
            .returning({ id: blingSyncLog.id });
        currentLogId = logEntry.id;
    }

    const items = await BlingApi.getProductsPage(token, page);

    if (!items.length) {
        await db
            .update(blingSyncLog)
            .set({ finishedAt: new Date(), status: 'done' })
            .where(eq(blingSyncLog.id, currentLogId));

        return {
            done: true,
            created: 0,
            updated: 0,
            errors: 0,
            skipped: 0,
            syncedInThisPage: 0,
            logId: currentLogId,
        };
    }

    let created = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;

    const handledParents = new Set<number>();

    for (const item of items) {
        try {
            const result = await upsertProductFromBling(token, item, handledParents);
            if (result === 'created') created++;
            else if (result === 'updated') updated++;
            else skipped++;
        } catch (error) {
            console.error(`Bling sync error for product ${item.id}:`, error);
            errors++;
        }
    }

    const done = items.length < BlingApi.BLING_SYNC_PAGE_SIZE;

    const current = await db.query.blingSyncLog.findFirst({
        where: eq(blingSyncLog.id, currentLogId),
    });

    await db
        .update(blingSyncLog)
        .set({
            productsSynced: (current?.productsSynced ?? 0) + items.length,
            productsCreated: (current?.productsCreated ?? 0) + created,
            productsUpdated: (current?.productsUpdated ?? 0) + updated,
            errors: (current?.errors ?? 0) + errors,
            status: done ? 'done' : 'running',
            finishedAt: done ? new Date() : null,
        })
        .where(eq(blingSyncLog.id, currentLogId));

    return {
        done,
        nextPage: page + 1,
        created,
        updated,
        errors,
        skipped,
        syncedInThisPage: items.length,
        logId: currentLogId,
    };
}

export async function syncStep(input?: {
    page?: number;
    logId?: string;
}): Promise<SyncStepResult> {
    if (input?.page) return syncProductsPage(input.page, input.logId);

    const resumable = await findResumableSync();
    if (resumable) return syncProductsPage(resumable.nextPage, resumable.logId);

    return syncProductsPage(1);
}