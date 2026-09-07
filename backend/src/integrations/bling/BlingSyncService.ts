import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { blingSyncLog, categories, productCategories, products, productsColors, productsSkus } from '../../config/db/schema';
import * as BlingApi from './BlingApi';
import * as BlingDomain from './BlingDomain';
import * as TokenService from './TokenService';
import type { BlingProductListItem, ParsedSku, SyncStepResult } from './types';
import { normalizeSize } from '../../domain/product/size';

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

// TRAVA ADITIVA DE CATEGORIA:
// A categoria gravada pelo painel é DEFINITIVA. O sync do Bling só pode ADICIONAR
// categoria a produto que ainda não tem NENHUMA ligação em product_categories, e
// NUNCA remove uma ligação. Se o produto já tem qualquer categoria (manual ou de
// backfill), o sync não mexe na categoria dele.
async function ensureProductCategoryLink(
    productId: string,
    categoryId?: string,
): Promise<void> {
    const existing = await db.query.productCategories.findFirst({
        where: eq(productCategories.productId, productId),
    });
    if (existing) return; // já tem categoria: fonte de verdade é o painel, não tocar.

    const catId = categoryId ?? (await ensureBlingCategory());

    await db
        .insert(productCategories)
        .values({ productId, categoryId: catId })
        .onConflictDoNothing();
}

// Compara cor sem acento E sem caixa. So a caixa nao bastava: no Bling as cores
// sao MAIUSCULAS ("LILASCORAÇÃO") e no painel sao mistas ("LilásCoração"), entao
// cada sincronizacao criava uma cor nova — desfazendo aos poucos a limpeza que
// reduziu 696 cores para 623.
const SEM_ACENTO_DE = 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç';
const SEM_ACENTO_PARA = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc';

async function resolveColorId(name: string): Promise<string> {
    const existing = await db.query.productsColors.findFirst({
        where: sql`lower(translate(${productsColors.name}, ${SEM_ACENTO_DE}, ${SEM_ACENTO_PARA}))
                 = lower(translate(${name}, ${SEM_ACENTO_DE}, ${SEM_ACENTO_PARA}))`,
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
        const size = normalizeSize(sku.size);
        if (!size) continue;

        const colorId = sku.color ? await resolveColorId(sku.color) : null;

        const existing = await db.query.productsSkus.findFirst({
            where: and(
                eq(productsSkus.productId, productId),
                eq(productsSkus.size, size),
                colorId ? eq(productsSkus.colorId, colorId) : isNull(productsSkus.colorId),
            ),
        });

        // O codigo do SKU vem PRONTO do Bling (v.codigo) e era descartado aqui: a
        // variacao nascia com estoque e vinculo, mas com o campo de codigo vazio.
        // Resultado: a Chris digitava a mao, um por um, o que ja existia do outro
        // lado — 40 codigos so no 26700.
        //
        // Na atualizacao so preenche quando esta VAZIO: o que ela digitou a mao
        // manda, o Bling nao sobrescreve.
        if (existing) {
            await db
                .update(productsSkus)
                .set({
                    stockQty: sku.stockQty,
                    blingId: sku.blingId,
                    reference: existing.reference || sku.skuCode || null,
                    updatedAt: new Date()
                })
                .where(eq(productsSkus.id, existing.id));
            keptIds.push(existing.id);
        } else {
            const [created]: { id: string }[] = await db
                .insert(productsSkus)
                .values({
                    productId,
                    size,
                    colorId,
                    stockQty: sku.stockQty,
                    blingId: sku.blingId,
                    reference: sku.skuCode || null,
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
        await ensureProductCategoryLink(byBlingId.id);
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
            await ensureProductCategoryLink(byCode.id);
            return 'updated';
        }
    }

    buildInput.categoryId = await ensureBlingCategory();

    const [created]: { id: string }[] = await db
        .insert(products)
        .values(BlingDomain.buildInsertValues(buildInput))
        .returning({ id: products.id });

    await syncSkuGrid(created.id, skus, parsed.skus.length > 0);
    await ensureProductCategoryLink(created.id, buildInput.categoryId);
    return 'created';
}

// Uma sincronizacao interrompida (aba fechada, deploy no meio, internet caindo)
// fica marcada como 'running' para sempre. Como toda nova sincronizacao RETOMA a
// que esta rodando, essa marca virava uma trava permanente: a de 24/08 parou com
// 2875 produtos, entao o retomar caia na pagina 116 de um catalogo com 24 —
// "rodava", nao achava nada e encerrava. Clicar em Sincronizar nao fazia mais
// efeito nenhum, sem nenhuma mensagem dizendo por que.
//
// Retomar so faz sentido logo depois; passado esse prazo a rodada esta morta.
const PRAZO_PARA_RETOMAR_MS = 6 * 60 * 60 * 1000;

export async function findResumableSync(): Promise<{
    logId: string;
    nextPage: number;
} | null> {
    const row = await db.query.blingSyncLog.findFirst({
        where: eq(blingSyncLog.status, 'running'),
        orderBy: [desc(blingSyncLog.startedAt)],
    });

    if (!row) return null;

    // Sem data de inicio nao da para saber a idade: trata como abandonada.
    const inicio = row.startedAt ? new Date(row.startedAt).getTime() : 0;
    if (Date.now() - inicio > PRAZO_PARA_RETOMAR_MS) {
        // Encerra a abandonada para nao travar as proximas, e deixa o historico
        // honesto em vez de mostrar "rodando" para sempre.
        await db
            .update(blingSyncLog)
            .set({ status: 'interrupted', finishedAt: new Date() })
            .where(eq(blingSyncLog.id, row.id));
        return null;
    }

    return {
        logId: row.id,
        nextPage: Math.floor(row.productsSynced / BlingApi.BLING_SYNC_PAGE_SIZE) + 1,
    };
}

// Sincronizacao COMPLETA rodando no servidor.
//
// Antes o laco que percorre as paginas vivia no navegador: a Chris precisava
// deixar a aba aberta e parada, e bastava uma chamada falhar para tudo parar no
// meio — foi o que aconteceu tres vezes seguidas, uma delas parando na segunda
// pagina. Aqui ela clica uma vez, fecha o que quiser, e o servidor termina.
//
// O progresso ja e gravado produto a produto, entao a tela acompanha lendo o
// historico. Se o servidor reiniciar no meio, a proxima rodada retoma de onde
// parou (findResumableSync).
let sincronizacaoEmAndamento = false;
const LIMITE_DE_PAGINAS = 2000; // trava de seguranca contra laco infinito

export function estaSincronizando(): boolean {
    return sincronizacaoEmAndamento;
}

export async function runFullSync(): Promise<void> {
    if (sincronizacaoEmAndamento) return;
    sincronizacaoEmAndamento = true;

    try {
        const retomavel = await findResumableSync();
        let page = retomavel?.nextPage ?? 1;
        let logId = retomavel?.logId;

        for (let i = 0; i < LIMITE_DE_PAGINAS; i++) {
            const passo = await syncProductsPage(page, logId);
            logId = passo.logId;
            if (passo.done) break;
            page = passo.nextPage ?? page + 1;
        }
    } catch (error) {
        // Nao deixa a marca 'running' presa: sem isso, a proxima sincronizacao
        // ficaria travada ate o prazo de 6h passar.
        console.error('Sincronizacao Bling parou no meio:', error);
        const emAndamento = await db.query.blingSyncLog.findFirst({
            where: eq(blingSyncLog.status, 'running'),
            orderBy: [desc(blingSyncLog.startedAt)],
        });
        if (emAndamento) {
            await db
                .update(blingSyncLog)
                .set({ status: 'interrupted', finishedAt: new Date() })
                .where(eq(blingSyncLog.id, emAndamento.id));
        }
    } finally {
        sincronizacaoEmAndamento = false;
    }
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
        let virou: 'created' | 'updated' | 'skipped' | 'error' = 'error';
        try {
            const result = await upsertProductFromBling(token, item, handledParents);
            virou = result === 'created' ? 'created' : result === 'updated' ? 'updated' : 'skipped';
            if (result === 'created') created++;
            else if (result === 'updated') updated++;
            else skipped++;
        } catch (error) {
            console.error(`Bling sync error for product ${item.id}:`, error);
            errors++;
        }

        // Grava o progresso a CADA produto, nao so no fim da pagina. Antes, uma
        // requisicao que morresse no meio perdia a pagina inteira e deixava o
        // registro em "rodando" com zero — sem nenhuma pista do que aconteceu.
        // Agora o pior caso e perder o produto que estava em andamento.
        await db
            .update(blingSyncLog)
            .set({
                productsSynced: sql`${blingSyncLog.productsSynced} + 1`,
                productsCreated: sql`${blingSyncLog.productsCreated} + ${virou === 'created' ? 1 : 0}`,
                productsUpdated: sql`${blingSyncLog.productsUpdated} + ${virou === 'updated' ? 1 : 0}`,
                errors: sql`${blingSyncLog.errors} + ${virou === 'error' ? 1 : 0}`,
            })
            .where(eq(blingSyncLog.id, currentLogId));
    }

    const done = items.length < BlingApi.BLING_SYNC_PAGE_SIZE;

    // Os contadores ja foram somados produto a produto no laco acima; aqui só
    // marca se a sincronizacao acabou.
    await db
        .update(blingSyncLog)
        .set({
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