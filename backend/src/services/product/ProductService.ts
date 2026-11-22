import * as ProductRepository from '../../repository/product/ProductRepository';
import * as ProductColorImageRepository from '../../repository/product/ProductColorImageRepository';
import { rodarDescontoProgramado } from '../../jobs/descontoProgramado.Job';

export function listProducts() {
    return ProductRepository.findAll();
}

export async function getProduct(id: string) {
    const product = await ProductRepository.findById(id);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    return product;
}

export async function updateProduct(id: string, values: Record<string, unknown>) {
    const product = await ProductRepository.update(id, values as never);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    return product;
}

export function saveFullProduct(
    input: { product: Record<string, unknown>; skus?: unknown; colorImages?: unknown },
    productId?: string,
) {
    const product = input.product ?? {};
    if (!product.name || typeof product.name !== 'string') throw new Error('NAME_REQUIRED');

    const toPrice = (v: unknown): string | null =>
        v === null || v === undefined || v === '' ? null : Number(v).toFixed(2);
    const toDate = (v: unknown): Date | null => {
        if (v === null || v === undefined || v === '') return null;
        const d = new Date(v as string);
        return Number.isNaN(d.getTime()) ? null : d;
    };
    // stockQty NAO entra: o painel nunca grava estoque (fonte = StockHub).
    const skus = Array.isArray(input.skus)
        ? input.skus
            .filter((s) => s && typeof s.size === 'string')
            .map((s) => ({
                size: s.size as string,
                color: typeof s.color === 'string' && s.color ? (s.color as string) : null,
                price: toPrice(s.price),
                salePrice: toPrice(s.salePrice),
                saleStart: toDate(s.saleStart),
                saleEnd: toDate(s.saleEnd),
                reference: typeof s.reference === 'string' && s.reference ? (s.reference as string) : null,
                minStock: Number.isFinite(Number(s.minStock)) ? Math.max(0, Math.round(Number(s.minStock))) : 0,
                active: s.active === undefined ? true : Boolean(s.active),
            }))
        : [];

    const colorImages = Array.isArray(input.colorImages)
        ? input.colorImages
            .filter((c) => c && typeof c.color === 'string' && Array.isArray(c.images))
            .map((c) => ({
                color: c.color as string,
                images: (c.images as unknown[]).filter((u): u is string => typeof u === 'string'),
            }))
        : [];

    // Depois de salvar, o desconto programado já se acerta na hora (cancelou,
    // mudou a data para agora...) em vez de esperar o próximo minuto do job.
    return ProductRepository.saveProductWithRelations(product as never, skus, colorImages, productId).then(async (id) => {
        await rodarDescontoProgramado().catch((e) => console.error('[DESCONTO-PROG] após salvar:', e));
        return id;
    });
}

export function listColorImages(productId: string) {
    return ProductColorImageRepository.findColorImagesWithNames(productId);
}

// O drizzle embrulha o erro do banco: o codigo (23503 = outro registro aponta
// para este) vem em err.cause.code, nao em err.code. Olhando so err.code, a
// exclusao de produto COM PEDIDO caia no erro generico e o painel dizia
// "Produto nao encontrado" para um produto que estava ali na lista.
function temRegistroDependente(err: unknown): boolean {
    const e = err as { code?: string; cause?: { code?: string } };
    return e?.code === '23503' || e?.cause?.code === '23503';
}

// Excluir de verdade quando da; ARQUIVAR quando o produto tem pedido. Um por vez,
// para um produto com pedido nao impedir a exclusao dos outros da selecao.
export async function deleteProducts(ids: string[]): Promise<{ deleted: number; archived: number }> {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('NO_IDS');
    let deleted = 0;
    let archived = 0;
    for (const id of ids) {
        try {
            await ProductRepository.deleteProductsCascade([id]);
            deleted++;
        } catch (err) {
            if (!temRegistroDependente(err)) throw err;
            await ProductRepository.archiveProducts([id]);
            archived++;
        }
    }
    return { deleted, archived };
}

export function bulkAction(ids: string[], action: 'activate' | 'deactivate' | 'delete') {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('NO_IDS');
    if (action === 'delete') return deleteProducts(ids);
    return ProductRepository.setActiveMany(ids, action === 'activate');
}
