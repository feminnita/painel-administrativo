import * as ProductsSkuRepository from '../../repository/product/ProductSkuRepository';

export function listSkusByProduct(productId: string) {
    return ProductsSkuRepository.findByProductIdWithOrders(productId);
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

/**
 * Lixeira da variacao (nao apaga cego):
 * - variacao COM pedido -> DESATIVA (active=false); historico intacto.
 * - variacao SEM pedido -> apaga de verdade.
 * Retorna qual acao ocorreu para o painel confirmar.
 */
export async function deleteSku(id: string): Promise<{ action: 'deleted' | 'deactivated' }> {
    if (await ProductsSkuRepository.hasOrders(id)) {
        const sku = await ProductsSkuRepository.deactivate(id);
        if (!sku) throw new Error('SKU_NOT_FOUND');
        return { action: 'deactivated' };
    }
    const sku = await ProductsSkuRepository.remove(id);
    if (!sku) throw new Error('SKU_NOT_FOUND');
    return { action: 'deleted' };
}