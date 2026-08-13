import * as ProductRepository from '../../repository/product/ProductRepository';
import * as ProductColorImageRepository from '../../repository/product/ProductColorImageRepository';

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

    const skus = Array.isArray(input.skus)
        ? input.skus
            .filter((s) => s && typeof s.size === 'string' && Number.isFinite(Number(s.stockQty)))
            .map((s) => ({
                size: s.size as string,
                color: typeof s.color === 'string' && s.color ? (s.color as string) : null,
                stockQty: Math.max(0, Math.round(Number(s.stockQty))),
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
