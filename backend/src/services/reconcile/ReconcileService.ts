import * as ReconcileRepository from '../../repository/reconcile/ReconcileRepository';
import * as SiteSettingsRepository from '../../repository/settings/SiteSettingsRepository';
import type { BackupRow, SkuRow } from '../../repository/reconcile/ReconcileRepository';

const BACKUP_KEY = 'bling_id_backup';

export type ReportItem = {
    produto_codigo: string;
    cor: string;
    tamanho: string;
    bling_id: string | null;
};

type Candidate = { sku_id: string; bling_id: string; item: ReportItem };

export type Classification = {
    gravaveis: ReportItem[];
    ambiguos: ReportItem[];
    colisao: ReportItem[];
    jaOcupado: ReportItem[];
    naoCasaram: ReportItem[];
    _candidates: Candidate[];
};

export type ReconcileReport = {
    counts: {
        gravaveis: number;
        ambiguos: number;
        colisao: number;
        jaOcupado: number;
        naoCasaram: number;
    };
    gravaveis: ReportItem[];
    ambiguos: ReportItem[];
    colisao: ReportItem[];
    jaOcupado: ReportItem[];
    naoCasaram: ReportItem[];
    backupTakenAt: string | null;
    backupRows: number;
};

// Normalização TOTAL dos dois lados — idêntica ao script validado.
function norm(s: unknown): string {
    return (s ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function keyOf(codigo: unknown, tamanho: unknown, cor: unknown): string {
    return `${norm(codigo)}|${norm(tamanho)}|${norm(cor)}`;
}

function itemOf(s: { produto_codigo: string | null; cor: string | null; tamanho: string }, blingId: string | null): ReportItem {
    return {
        produto_codigo: s.produto_codigo ?? '',
        cor: s.cor ?? '',
        tamanho: s.tamanho ?? '',
        bling_id: blingId,
    };
}

// Lógica pura de reconciliação — recebe os SKUs atuais e as linhas do snapshot,
// devolve a classificação completa. Não toca no banco.
export function classify(skuRows: SkuRow[], backupRows: BackupRow[]): Classification {
    // snapshot: chave -> Set(bling_id distintos). >1 distinto = AMBÍGUA.
    const snapMap = new Map<string, Set<string>>();
    for (const r of backupRows) {
        const bid = r.bling_id == null ? '' : String(r.bling_id).trim();
        if (!bid) continue;
        const k = keyOf(r.produto_codigo, r.tamanho, r.cor);
        if (!snapMap.has(k)) snapMap.set(k, new Set());
        snapMap.get(k)!.add(bid);
    }

    // bling_ids já ocupados = todos os bling_id não-nulos ATUAIS (não reusar).
    const occupied = new Set<string>();
    for (const s of skuRows) {
        if (s.bling_id != null && String(s.bling_id).trim() !== '') {
            occupied.add(String(s.bling_id).trim());
        }
    }

    const ambiguos: ReportItem[] = [];
    const jaOcupado: ReportItem[] = [];
    const naoCasaram: ReportItem[] = [];
    const candidates: Candidate[] = [];

    for (const s of skuRows) {
        // só SKUs sem vínculo
        if (s.bling_id != null && String(s.bling_id).trim() !== '') continue;

        const k = keyOf(s.produto_codigo, s.tamanho, s.cor);
        const set = snapMap.get(k);

        if (!set || set.size === 0) {
            naoCasaram.push(itemOf(s, null));
            continue;
        }
        if (set.size > 1) {
            ambiguos.push(itemOf(s, null));
            continue;
        }
        const bid = [...set][0];
        if (occupied.has(bid)) {
            jaOcupado.push(itemOf(s, bid));
            continue;
        }
        candidates.push({ sku_id: s.sku_id, bling_id: bid, item: itemOf(s, bid) });
    }

    // ANTI-COLISÃO: mesmo bling_id candidato de >1 SKU → COLISÃO (remove todos).
    const byBling = new Map<string, Candidate[]>();
    for (const c of candidates) {
        if (!byBling.has(c.bling_id)) byBling.set(c.bling_id, []);
        byBling.get(c.bling_id)!.push(c);
    }

    const gravaveis: ReportItem[] = [];
    const colisao: ReportItem[] = [];
    const gravaveisCandidates: Candidate[] = [];
    for (const group of byBling.values()) {
        if (group.length > 1) {
            for (const g of group) colisao.push(g.item);
        } else {
            gravaveis.push(group[0].item);
            gravaveisCandidates.push(group[0]);
        }
    }

    return { gravaveis, ambiguos, colisao, jaOcupado, naoCasaram, _candidates: gravaveisCandidates };
}

type Backup = { takenAt?: string; source?: string; rows?: BackupRow[] };

async function loadBackup(): Promise<Backup> {
    const setting = await SiteSettingsRepository.findByKey(BACKUP_KEY);
    if (!setting) throw new Error('NO_BACKUP');
    const value = setting.value as unknown as Backup;
    if (!value || !Array.isArray(value.rows)) throw new Error('NO_BACKUP');
    return value;
}

function toReport(c: Classification, backup: Backup): ReconcileReport {
    return {
        counts: {
            gravaveis: c.gravaveis.length,
            ambiguos: c.ambiguos.length,
            colisao: c.colisao.length,
            jaOcupado: c.jaOcupado.length,
            naoCasaram: c.naoCasaram.length,
        },
        gravaveis: c.gravaveis,
        ambiguos: c.ambiguos,
        colisao: c.colisao,
        jaOcupado: c.jaOcupado,
        naoCasaram: c.naoCasaram,
        backupTakenAt: backup.takenAt ?? null,
        backupRows: backup.rows?.length ?? 0,
    };
}

export async function dryRun(): Promise<ReconcileReport> {
    const backup = await loadBackup();
    const skuRows = await ReconcileRepository.fetchSkuRows();
    const classification = classify(skuRows, backup.rows ?? []);
    return toReport(classification, backup);
}

export async function apply(): Promise<ReconcileReport & { gravou: number }> {
    const backup = await loadBackup();
    const skuRows = await ReconcileRepository.fetchSkuRows();
    const classification = classify(skuRows, backup.rows ?? []);

    let gravou = 0;
    for (const c of classification._candidates) {
        gravou += await ReconcileRepository.applyBinding(c.sku_id, c.bling_id);
    }

    return { ...toReport(classification, backup), gravou };
}

// Re-snapshota o vínculo ATUAL para tirar um baseline novo antes de uma nova
// rodada. SOBRESCREVE o snapshot anterior em site_settings.bling_id_backup.
export async function refreshBackup(): Promise<{ takenAt: string; rows: number }> {
    const rows = await ReconcileRepository.fetchCurrentBinding();
    const takenAt = new Date().toISOString();
    await SiteSettingsRepository.upsert(BACKUP_KEY, {
        takenAt,
        source: 'painel-reconcile-refresh',
        rows,
    });
    return { takenAt, rows: rows.length };
}
