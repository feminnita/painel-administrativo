import type { BlingProductDetail, BlingProductListItem, BlingStockDeposit, ParsedSku, BuildPayloadInput, SalesOrderData } from "./types";
import { normalizeSize } from "../../domain/product/size";

const PIX_DISCOUNT_RATE = 0.05;

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200);
}

export function buildProductSlug(name: string, code: string): string {
    return `${slugify(name)}-${slugify(code)}`.replace(/-+$/, '');
}

export function sumStock(deposits: BlingStockDeposit[]): number {
    return deposits.reduce(
        (sum, d) => sum + (Number.parseFloat(String(d.saldoVirtual ?? '0')) || 0),
        0,
    );
}

export function calcPixPrice(basePrice: number): number {
    return Number.parseFloat((basePrice * (1 - PIX_DISCOUNT_RATE)).toFixed(2));
}

export function parseVariations(
    variations: BlingProductDetail['variacoes'] = [],
): {
    skus: ParsedSku[];
    colors: string[];
    sizes: string[];
} {

    const colorSet = new Set<string>();
    const sizesSet = new Set<string>();
    const skus: ParsedSku[] = [];

    for (const v of variations) {
        const attrs = v.variacao?.nome?.split(";") ?? [];
        let color = '';
        let size = '';

        for (const attr of attrs) {
            const [key, val] = attr.split(':').map((s) => s.trim());

            if (key?.toLowerCase().includes('cor')) color = val || '';
            else if (
                key?.toLowerCase().includes('tamanho') ||
                key?.toLowerCase().includes('tam')
            )

                size = val || '';
            else if (!color) color = val || '';
        }

        size = normalizeSize(size);

        if (color) colorSet.add(color);
        if (size) sizesSet.add(size);

        skus.push({
            size,
            color,
            skuCode: v.codigo ?? '',
            stockQty: Number.parseFloat(String(v.estoque?.saldoVirtualTotal ?? '0')) || 0,
            blingId: v.id ?? null,
        });
    }

    return {
        skus,
        colors: Array.from(colorSet),
        sizes: Array.from(sizesSet),
    }
}

function baseNumbers(input: BuildPayloadInput) {
    const { item, detail } = input;

    const basePrice = Number.parseFloat(String(detail.preco ?? item.preco ?? '0')) || 0;
    const promoPrice = Number.parseFloat(String(detail.precoPromocional ?? '0')) || null;

    // Medida que o Bling nao mandou vira null, e quem grava mantem o valor que
    // o produto ja tem. Antes cada campo tinha um numero inventado (5, 15, 20):
    // produto que chegava zerado do Bling ganhava medida de mentira, e essa
    // medida ia direto para o calculo de frete sem ninguem perceber.
    //
    // A armadilha era o `|| default`: parseFloat('0') da 0, que e falso em JS,
    // entao TODO zero virava o default silenciosamente.
    const medida = (v: unknown) => {
        const n = Number.parseFloat(String(v ?? ''));
        return Number.isFinite(n) && n > 0 ? n : null;
    };

    const weightKg = medida(detail.pesoBruto);
    const height = medida(detail.dimensoes?.altura);
    const width = medida(detail.dimensoes?.largura);
    // A resposta da API v3 traz `profundidade`; `comprimento` nao existe nela,
    // entao este campo caia no default 20 em TODOS os produtos.
    const length = medida(detail.dimensoes?.profundidade ?? detail.dimensoes?.comprimento);


    return {
        basePrice,
        promoPrice,
        weightKg,
        height,
        width,
        length
    }
}

export function buildUpdateValues(input: BuildPayloadInput) {
    const { item, detail } = input;
    const number = baseNumbers(input);

    const name = detail.nome || item.nome || 'Produto';
    const code = detail.codigo || item.codigo || '';

    return {
        name,
        code: code || null,
        basePrice: number.basePrice.toFixed(2),
        pixPrice: calcPixPrice(number.basePrice).toFixed(2),
        salePrice: number.promoPrice ? number.promoPrice.toFixed(2) : null,
        stock: input.stock,
        // Sem medida vinda do Bling, o campo sai do update: o produto fica com
        // o que ja tinha, em vez de perder a medida boa que alguem cadastrou.
        ...(number.weightKg !== null && { weightKg: number.weightKg.toFixed(3) }),
        ...(number.height !== null && { pkgHeigthCm: number.height.toFixed(2) }),
        ...(number.width !== null && { pkgWidthCm: number.width.toFixed(2) }),
        ...(number.length !== null && { pkgLengthCm: number.length.toFixed(2) }),
        colors: input.colors,
        sizes: input.sizes,
        blingId: item.id
    };
}

export function buildInsertValues(input: BuildPayloadInput) {
    const { item, detail } = input;

    const name = detail.nome || item.nome || 'Produto';
    const code = detail.codigo || item.codigo || '';

    return {
        ...buildUpdateValues(input),
        slug: buildProductSlug(name, code),
        description: detail.descricaoCurta || detail.descricao || null,
        categoryId: input.categoryId,
        active: detail.situacao === 'A',
        featured: false,
        isNew: false,
        isBestSeller: false,
        images: [] as string[],
    }
}

export function buildSalesOrderPayload(data: SalesOrderData, now: Date, contactId: number) {

    const { order, items, customer } = data;
    const addr = (order.shippingAddress ?? {}) as Record<string, string>;
    const today = now.toISOString().slice(0, 10);

    const paymentLabel = order.paymentMethod === 'pix'
        ? 'PIX'
        : order.paymentMethod === 'boleto'
            ? 'Boleto'
            : 'Cartão de Crédito';

    // modFrete da NF-e = quem CONTRATA o transporte (não quem paga).
    // Retirada no local = sem transporte: fretePorConta 9, sem frete, sem etiqueta/endereço
    // (senão o Bling monta transporte que não existe). Qualquer envio = 0 (remetente/CIF:
    // a loja contrata a etiqueta no ME). Deriva do método de entrega, nunca hardcode.
    const isPickup = /retir/i.test(String(order.shippingMethod ?? ''));
    const transporte = isPickup
        ? { fretePorConta: 9 }
        : {
            fretePorConta: 0,
            frete: Number(order.shippingCost ?? 0),
            codigoRastreamento: order.trackingCode || '',
            etiqueta: {
                nome: customer?.name || '',
                endereco: addr.street || '',
                numero: addr.number || 'S/N',
                complemento: addr.complement || '',
                municipio: addr.city || '',
                uf: addr.state || '',
                cep: (addr.cep || '').replace(/\D/g, ''),
                bairro: addr.neighborhood || '',
            },
        };

    return {
        data: new Date(order.createdAt ?? now).toISOString().slice(0, 10),
        dataSaida: today,
        contato: { id: contactId },
        desconto: {
            valor: Number(order.discount ?? 0),
            unidade: 'REAL',
        },
        itens: items.map((item) => {
            const blingProductId = item.skuBlingId ?? item.productBlingId;
            return {
                codigo: item.productCode || undefined,
                descricao: [item.productName, item.size, item.color]
                    .filter(Boolean)
                    .join(' - '),
                quantidade: item.quantity,
                valor: Number(item.unitPrice),
                desconto: 0,
                ...(blingProductId ? { produto: { id: blingProductId } } : {}),
            };
        }),
        parcelas: [
            {
                dataVencimento: today,
                valor: Number(order.total),
                observacoes: paymentLabel,
            },
        ],
        transporte,
        observacoes: `Pedido ${order.orderNumber} via site Feminnita | ${order.paymentMethod?.toUpperCase()} | ID: ${order.id}`,
    };
}