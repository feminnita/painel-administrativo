import * as ProductRepository from '../../repository/product/ProductRepository';
import * as ProductColorImageRepository from '../../repository/product/ProductColorImageRepository';
import { assertPriceAllowsPublish } from '../../domain/product/price';

export function listProducts() {
    return ProductRepository.findAll();
}

export async function getProduct(id: string) {
    const product = await ProductRepository.findById(id);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    return product;
}

export async function updateProduct(id: string, values: Record<string, unknown>) {
    // Trava: nao deixa ATIVAR nem EXIBIR na loja produto com preco <= 0.
    if (values.active === true || values.visibleInStore === true) {
        const existing = await ProductRepository.findById(id);
        if (!existing) throw new Error('PRODUCT_NOT_FOUND');
        assertPriceAllowsPublish({
            basePrice: existing.basePrice,
            salePrice: existing.salePrice,
            active: (values.active as boolean | undefined) ?? existing.active,
            visibleInStore: (values.visibleInStore as boolean | undefined) ?? existing.visibleInStore,
        });
    }
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

    // Trava: produto com preco de venda efetivo <= 0 nao pode nascer/ficar ativo nem visivel.
    assertPriceAllowsPublish({
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        active: product.active as boolean | undefined,
        visibleInStore: product.visibleInStore as boolean | undefined,
    });

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

    return ProductRepository.saveProductWithRelations(product as never, skus, colorImages, productId);
}

export function listColorImages(productId: string) {
    return ProductColorImageRepository.findColorImagesWithNames(productId);
}

export async function deleteProducts(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('NO_IDS');
    try {
        await ProductRepository.deleteProductsCascade(ids);
    } catch (err) {
        if ((err as { code?: string }).code === '23503') throw new Error('PRODUCT_HAS_ORDERS');
        throw err;
    }
}

export function bulkAction(ids: string[], action: 'activate' | 'deactivate' | 'delete') {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('NO_IDS');
    if (action === 'delete') return deleteProducts(ids);
    return ProductRepository.setActiveMany(ids, action === 'activate');
}
