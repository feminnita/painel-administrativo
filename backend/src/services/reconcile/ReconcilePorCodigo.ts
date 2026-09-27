import * as ReconcileRepository from '../../repository/reconcile/ReconcileRepository';
import * as BlingApi from '../../integrations/bling/BlingApi';
import * as TokenService from '../../integrations/bling/TokenService';
import type { SkuSemVinculo } from '../../repository/reconcile/ReconcileRepository';

/**
 * Religa variação da loja ao Bling pelo CÓDIGO da variação.
 *
 * Por que existe, além da reconciliação que já havia: aquela casa contra o
 * snapshot `bling_id_backup`, então só devolve vínculo que um dia existiu. Em
 * 27/09/2026 o 24520 tinha 21 variações sem vínculo e o snapshot só resolvia 6
 * — as outras 15 nunca foram ligadas, não havia o que restaurar. Enquanto isso
 * o Bling tinha as 21, com saldo: 20.454 peças que a loja mostrava esgotadas,
 * porque a sincronização de saldo só atualiza quem tem vínculo.
 *
 * Por que pelo CÓDIGO e não por cor + tamanho: tentei por cor primeiro e errei.
 * A Chris cadastrou a variação copiando o código do Bling, e nele a cor vem
 * abreviada ("24520ROCORAÇÃOM") enquanto o NOME da variação vem por extenso
 * ("Cor:Rosacoração"). Comparar nome contra nome dizia que a cor não existia lá,
 * e ainda marcava como ambígua uma variação que é única. Pelo código deram 21 de
 * 21, sem ambiguidade. O código é a chave que as duas pontas realmente
 * compartilham.
 *
 * A gravação é ADITIVA e passa pelo mesmo `applyBinding` da outra passada: só
 * escreve em variação sem vínculo e só se aquele bling_id não estiver em uso.
 */

export type ItemPorCodigo = {
    produto_codigo: string;
    cor: string;
    tamanho: string;
    referencia: string;
    bling_id: string | null;
};

export type RelatorioPorCodigo = {
    counts: {
        gravaveis: number;
        semParNoBling: number;
        ambiguos: number;
        jaOcupado: number;
        colisao: number;
    };
    gravaveis: ItemPorCodigo[];
    semParNoBling: ItemPorCodigo[];
    ambiguos: ItemPorCodigo[];
    jaOcupado: ItemPorCodigo[];
    colisao: ItemPorCodigo[];
    produtosNaoAchados: string[];
};

type Candidato = { sku_id: string; bling_id: string; item: ItemPorCodigo };

type Classificacao = RelatorioPorCodigo & { _candidatos: Candidato[] };

// Mesma normalização da outra passada: o código vem com acento de um lado e sem
// do outro ("24520MACORAÇÕESPINKM" na loja, "24520MACORAÇOESPINKM" no Bling).
function norm(s: unknown): string {
    return (s ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

const AMBIGUO = Symbol('ambiguo');

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function itemDe(s: SkuSemVinculo, blingId: string | null): ItemPorCodigo {
    return {
        produto_codigo: s.produto_codigo ?? '',
        cor: s.cor ?? '',
        tamanho: s.tamanho,
        referencia: s.referencia ?? '',
        bling_id: blingId,
    };
}

// Monta, para um código de produto da loja, o índice das variações do Bling
// por código. Devolve null quando o produto não foi achado lá.
async function variacoesDoProduto(
    token: string,
    codigo: string,
): Promise<Map<string, number | typeof AMBIGUO> | null> {
    const achados = await BlingApi.getProductsByCode(token, codigo);

    // O filtro do Bling é busca, não chave: confere o código antes de aceitar.
    const exatos = achados.filter((p) => norm(p.codigo) === norm(codigo));
    if (exatos.length !== 1) return null;

    const detalhe = await BlingApi.getProductDetail(token, String(exatos[0].id));
    if (!detalhe?.variacoes?.length) return null;

    const porCodigo = new Map<string, number | typeof AMBIGUO>();
    for (const v of detalhe.variacoes) {
        const k = norm(v.codigo);
        if (!k || v.id == null) continue;
        porCodigo.set(k, porCodigo.has(k) ? AMBIGUO : v.id);
    }
    return porCodigo;
}

async function classificar(): Promise<Classificacao> {
    const token = await TokenService.getAccessToken();
    if (!token) throw new Error('SEM_TOKEN_BLING');

    const skus = await ReconcileRepository.fetchSkusSemVinculo();

    // bling_ids já em uso hoje — para a prévia dizer "já ocupado" em vez de
    // deixar a gravação falhar calada.
    const ocupados = new Set<string>();
    for (const r of await ReconcileRepository.fetchCurrentBinding()) {
        const bid = String(r.bling_id ?? '').trim();
        if (bid) ocupados.add(bid);
    }

    const porProduto = new Map<string, SkuSemVinculo[]>();
    for (const s of skus) {
        const k = s.produto_codigo ?? '';
        if (!porProduto.has(k)) porProduto.set(k, []);
        porProduto.get(k)!.push(s);
    }

    const semParNoBling: ItemPorCodigo[] = [];
    const ambiguos: ItemPorCodigo[] = [];
    const jaOcupado: ItemPorCodigo[] = [];
    const produtosNaoAchados: string[] = [];
    const candidatos: Candidato[] = [];

    for (const [codigo, lista] of porProduto) {
        let indice: Map<string, number | typeof AMBIGUO> | null = null;
        try {
            indice = await variacoesDoProduto(token, codigo);
        } catch (error) {
            // Um produto que falha não pode derrubar a prévia inteira: os outros
            // seguem e este aparece como não achado.
            console.error(`[RECONCILIA CODIGO] produto ${codigo} falhou:`, error);
            indice = null;
        }

        if (!indice) {
            produtosNaoAchados.push(codigo);
            for (const s of lista) semParNoBling.push(itemDe(s, null));
            await pausa(400);
            continue;
        }

        for (const s of lista) {
            const achado = indice.get(norm(s.referencia));
            if (achado === undefined) {
                semParNoBling.push(itemDe(s, null));
                continue;
            }
            if (achado === AMBIGUO) {
                ambiguos.push(itemDe(s, null));
                continue;
            }
            const bid = String(achado);
            if (ocupados.has(bid)) {
                jaOcupado.push(itemDe(s, bid));
                continue;
            }
            candidatos.push({ sku_id: s.sku_id, bling_id: bid, item: itemDe(s, bid) });
        }

        // O Bling corta em 3 requisições por segundo e cada produto gasta duas.
        await pausa(400);
    }

    // ANTI-COLISÃO: o mesmo bling_id candidato de mais de uma variação é sinal
    // de referência repetida na loja. Nenhuma das duas é gravada — escolher
    // uma faria a venda baixar o estoque da peça errada.
    const porBling = new Map<string, Candidato[]>();
    for (const c of candidatos) {
        if (!porBling.has(c.bling_id)) porBling.set(c.bling_id, []);
        porBling.get(c.bling_id)!.push(c);
    }

    const gravaveis: ItemPorCodigo[] = [];
    const colisao: ItemPorCodigo[] = [];
    const finais: Candidato[] = [];
    for (const grupo of porBling.values()) {
        if (grupo.length > 1) {
            for (const g of grupo) colisao.push(g.item);
        } else {
            gravaveis.push(grupo[0].item);
            finais.push(grupo[0]);
        }
    }

    return {
        counts: {
            gravaveis: gravaveis.length,
            semParNoBling: semParNoBling.length,
            ambiguos: ambiguos.length,
            jaOcupado: jaOcupado.length,
            colisao: colisao.length,
        },
        gravaveis,
        semParNoBling,
        ambiguos,
        jaOcupado,
        colisao,
        produtosNaoAchados,
        _candidatos: finais,
    };
}

export async function dryRunPorCodigo(): Promise<RelatorioPorCodigo> {
    const { _candidatos, ...relatorio } = await classificar();
    void _candidatos;
    return relatorio;
}

export async function applyPorCodigo(): Promise<RelatorioPorCodigo & { gravou: number }> {
    const { _candidatos, ...relatorio } = await classificar();

    let gravou = 0;
    for (const c of _candidatos) {
        gravou += await ReconcileRepository.applyBinding(c.sku_id, c.bling_id);
    }

    return { ...relatorio, gravou };
}
