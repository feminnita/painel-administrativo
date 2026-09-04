export type ReconcileItem = {
    produto_codigo: string;
    cor: string;
    tamanho: string;
    bling_id: string | null;
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
