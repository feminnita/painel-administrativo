import * as ProductsSkuRepository from '../../repository/product/ProductSkuRepository';
import { assertPriceAllowsPublish } from '../../domain/product/price';

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
    // Trava: variacao nasce ativa; preco efetivo <= 0 nao pode ficar ativo.
    assertPriceAllowsPublish({ basePrice: input.price, salePrice: input.salePrice, active: true });
    return ProductsSkuRepository.insert(input);
}

export async function updateSku(id: string, input: Record<string, unknown>) {
    // Trava: se a variacao vai (ou continua) ativa e o preco muda, valida preco <= 0.
    if (input.active === true || 'price' in input || 'salePrice' in input) {
        const existing = await ProductsSkuRepository.findById(id);
        if (!existing) throw new Error('SKU_NOT_FOUND');
        const active = (input.active as boolean | undefined) ?? existing.active;
        assertPriceAllowsPublish({
            basePrice: 'price' in input ? input.price : existing.price,
            salePrice: 'salePrice' in input ? input.salePrice : existing.salePrice,
            active,
        });
    }
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