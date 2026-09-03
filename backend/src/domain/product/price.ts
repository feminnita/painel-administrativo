// Trava de gravacao: um produto/variacao com preco de venda efetivo <= 0 nao
// pode ficar ATIVO nem VISIVEL na loja. Bloqueia o erro manual na origem.
// (O serializer da vitrine trata o esconder no site, a parte.)

export const PRICE_INVALID_ACTIVE = 'PRICE_INVALID_ACTIVE';

export const PRICE_INVALID_ACTIVE_MESSAGE =
    'Produto com preço ≤ 0 não pode ficar ativo nem visível na loja — corrija o preço.';

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Preco de venda efetivo: usa o promocional quando informado, senao o cheio.
 * Retorna null quando nao ha preco informado (ex.: variacao que herda o do pai).
 */
export function effectiveSalePrice(basePrice: unknown, salePrice: unknown): number | null {
    const sale = toNumber(salePrice);
    if (sale !== null) return sale;
    return toNumber(basePrice);
}

/**
 * Rejeita a gravacao quando o registro esta ativo OU visivel na loja e o preco
 * de venda efetivo e <= 0. Se nao ha preco informado (null), nao bloqueia.
 */
export function assertPriceAllowsPublish(opts: {
    basePrice?: unknown;
    salePrice?: unknown;
    active?: boolean | null;
    visibleInStore?: boolean | null;
}): void {
    if (!opts.active && !opts.visibleInStore) return;
    const eff = effectiveSalePrice(opts.basePrice, opts.salePrice);
    if (eff !== null && eff <= 0) throw new Error(PRICE_INVALID_ACTIVE);
}
