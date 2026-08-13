import * as ProductsSkuRepository from '../../repository/product/ProductSkuRepository';

export function listSkusByProduct(productId: string) {
    return ProductsSkuRepository.findByProductId(productId);
}

export function createSku(input: {
    productId: string;
    size: string;
    colorId: string;
    stockQty?: number;
    price: string;
    salePrice: string;
}) {
    return ProductsSkuRepository.insert(input);
}

export async function updateSku(id: string, input: Record<string, unknown>) {
    const sku = await ProductsSkuRepository.update(id, input);
    if (!sku) throw new Error('SKU_NOT_FOUND');
    return sku;
}

export async function deleteSku(id: string) {
    const sku = await ProductsSkuRepository.remove(id);
    if (!sku) throw new Error('SKU_NOT_FOUND');
    return sku;
} 