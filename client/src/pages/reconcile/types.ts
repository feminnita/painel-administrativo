export type ReconcileItem = {
    produto_codigo: string;
    cor: string;
    tamanho: string;
    bling_id: string | null;
    // Só a passada pelo código preenche: é a chave que ela usa para casar, e
    // ver o código na lista é o que deixa conferir antes de aplicar.
    referencia?: string;
};

export type ReconcileReport = {
    counts: {
        gravaveis: number;
        ambiguos: number;
        colisao: number;
        jaOcupado: number;
        naoCasaram: number;
    };
    gravaveis: ReconcileItem[];
    ambiguos: ReconcileItem[];
    colisao: ReconcileItem[];
    jaOcupado: ReconcileItem[];
    naoCasaram: ReconcileItem[];
    backupTakenAt: string | null;
    backupRows: number;
};

export type ApplyReport = ReconcileReport & { gravou: number };

export type RefreshResult = { takenAt: string; rows: number };

// Passada pelo CÓDIGO da variação, contra o Bling ao vivo. Não usa snapshot,
// então resolve vínculo que nunca existiu — o que a reconciliação acima não
// alcança.
export type CodigoReport = {
    counts: {
        gravaveis: number;
        semParNoBling: number;
        ambiguos: number;
        jaOcupado: number;
        colisao: number;
    };
    gravaveis: ReconcileItem[];
    semParNoBling: ReconcileItem[];
    ambiguos: ReconcileItem[];
    jaOcupado: ReconcileItem[];
    colisao: ReconcileItem[];
    produtosNaoAchados: string[];
};

export type CodigoApplyReport = CodigoReport & { gravou: number };
