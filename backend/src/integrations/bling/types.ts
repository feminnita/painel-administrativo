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
};

export type SyncStepResult = {
    done: boolean;
    nextPage?: number;
    created: number;
    updated: number;
    errors: number;
    syncedInThisPage: number;
    logId: string;
};