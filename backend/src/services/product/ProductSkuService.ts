import * as ProductsSkuRepository from '../../repository/product/ProductSkuRepository';
import * as Apagadas from '../../repository/product/VariacoesApagadasRepository';
import { db } from '../../config/db';
import { sql } from 'drizzle-orm';

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
    // Le cor e tamanho ANTES de apagar: depois a linha nao existe mais e nao
    // haveria o que registrar.
    const { rows } = await db.execute(sql`
        SELECT s.product_id, s.size, c.name AS color
        FROM products_skus s
        LEFT JOIN products_colors c ON c.id = s.color_id
        WHERE s.id = ${id}
    `);
    const alvo = rows[0] as { product_id: string; size: string; color: string | null } | undefined;

    if (await ProductsSkuRepository.hasOrders(id)) {
        const sku = await ProductsSkuRepository.deactivate(id);
        if (!sku) throw new Error('SKU_NOT_FOUND');
        // Desativada tambem entra na lista: a Chris mandou tirar da loja, e o
        // save nao pode reativar sem ela pedir.
        if (alvo) await Apagadas.marcar(alvo.product_id, alvo.color, alvo.size);
        return { action: 'deactivated' };
    }

    const sku = await ProductsSkuRepository.remove(id);
    if (!sku) throw new Error('SKU_NOT_FOUND');

    // A MARCA e o que faz "apagou, ficou apagado". Sem ela, qualquer coisa que
    // reconstrua a grade (Gerar variacoes, marcar cor, marcar tamanho) recria a
    // linha em branco no dia seguinte — foi o que aconteceu no 24520.
    if (alvo) await Apagadas.marcar(alvo.product_id, alvo.color, alvo.size);

    return { action: 'deleted' };
}