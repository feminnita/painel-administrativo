export type BlingTokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
};

export type BlingProductListItem = {
    id: number;
    nome?: string;
    codigo?: string;
    preco?: string | number;
    idProdutoPai?: number;
};

export type BlingProductVariation = {
    id?: number;
    codigo?: string;
    estoque?: {
        saldoVirtualTotal?: string | number
    };
    variacao?: {
        nome?: string;
        produtoPai?: {
            id: number
        };
    };
};

export type BlingProductDetail = {
    id: number;
    nome?: string;
    codigo?: string;
    preco?: string | number;
    precoPromocional?: string | number;
    descricaoCurta?: string;
    descricao?: string;
    situacao?: string;
    idProdutoPai?: number;
    variacao?: {
        produtoPai?: {
            id: number
        }
    };
    categoria?: { descricao?: string };
    pesoBruto?: string | number;
    dimensoes?: {
        altura?: string | number;
        largura?: string | number;
        comprimento?: string | number;
    };
    variacoes?: BlingProductVariation[];
};

export type BlingStockDeposit = { saldoVirtual?: string | number };

export type BlingContact = {
    id: number;
    nome?: string;
    email?: string;
    telefone?: string;
    tipo?: string;
    numeroDocumento?: string;
    endereco?: {
        geral?: {
            endereco?: string;
            numero?: string;
            bairro?: string;
            cep?: string;
            municipio?: string;
            uf?: string;
        };
    };
};

export type ParsedSku = {
    size: string;
    color: string;
    skuCode: string;
    stockQty: number;
    blingId: number | null;
};

export type SyncStepResult = {
    done: boolean;
    nextPage?: number;
    created: number;
    updated: number;
    errors: number;
    skipped: number;
    syncedInThisPage: number;
    logId: string;
};

export type BuildPayloadInput = {
    item: BlingProductListItem;
    detail: BlingProductDetail;
    stock: number;
    colors: string[];
    sizes: string[];
    categoryId: string | null;
};

export type SalesOrderData = {
    order: {
        id: string;
        orderNumber: string;
        createdAt: Date | string | null;
        subtotal: string;
        discount: string | null;
        total: string;
        paymentMethod: string | null;
        shippingCost: string | null;
        shippingAddress: Record<string, unknown> | null;
        trackingCode: string | null;
        shippingMethod: string | null;
    };
    items: {
        productName: string;
        unitPrice: string;
        quantity: number;
        size: string | null;
        color: string | null;
        productCode: string | null;
        productBlingId: number | null;
        skuBlingId: number | null;
    }[];
    customer: {
        name?: string;
        email?: string;
        cpf?: string | null;
        phone?: string | null;
    } | null;
};

