import { sql } from 'drizzle-orm';
import { db } from '../../config/db';
import * as TokenService from './TokenService';

/**
 * Traz o SALDO do Bling para a loja, sozinho, de tempo em tempo.
 *
 * Por que isto existe: até aqui o fluxo era de mão única. O envio de pedidos
 * PARA o Bling roda a cada 2 minutos (BlingAutoPush), mas o caminho de volta —
 * o estoque — dependia de alguém clicar em "sincronizar" no painel. Em 27/09 o
 * log mostrava a última rodada em 20/09, sete dias antes, e interrompida na
 * metade (2.255 de ~2.900 produtos). Das cinco últimas, quatro não terminaram.
 *
 * O efeito é a loja vender o que já foi embora. O mesmo estoque físico sai em
 * Shopee, Shein, Mercado Livre, Amazon e TikTok; cada venda lá baixa o Bling, e
 * o site, parado no saldo da semana passada, continua oferecendo a peça. Foi o
 * que aconteceu com o FEM-1037: o site achou que tinha uma unidade do
 * 40500BRANCOXADREZGG e o Bling recusou o pedido inteiro por saldo insuficiente.
 *
 * Por que NÃO reaproveitar a sincronização que já existe: aquela varre produto
 * por produto (nome, fotos, variações, preço), leva horas e é justamente a que
 * quebra no meio. Esta pede só o saldo, em lote, e fecha em torno de meio
 * minuto — então pode rodar sempre, e uma falha não deixa nada pela metade.
 */

// 30 ids por chamada: medido em 465 ms para os 30 saldos. Subir mais não
// compensa — o limite do Bling é por requisição, não por id.
const IDS_POR_CHAMADA = 30;

// O Bling corta em 3 requisições por segundo. 400 ms deixa margem para a
// latência variar sem a gente encostar no teto e levar 429.
const PAUSA_ENTRE_CHAMADAS_MS = 400;

const INTERVALO_MS = 15 * 60 * 1000;

let rodando = false;

type SaldoDoBling = {
    produto?: { id?: number };
    saldoFisicoTotal?: number;
};

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function saldosDoLote(token: string, ids: number[]): Promise<Map<number, number>> {
    const query = ids.map((id) => `idsProdutos[]=${id}`).join('&');

    // O 429 acontece: na primeira rodada real, 3 dos 83 lotes bateram no limite
    // mesmo com a pausa. Pular o lote deixaria 30 SKUs com saldo velho por 15
    // minutos sem motivo — esperar um pouco e repetir resolve na hora. O tempo
    // cresce a cada tentativa para nao insistir no mesmo segundo ocupado.
    let res: Response | null = null;

    for (let tentativa = 0; tentativa < 3; tentativa++) {
        res = await fetch(`https://api.bling.com.br/Api/v3/estoques/saldos?${query}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(20000),
        });

        if (res.status !== 429) break;
        await pausa(1000 * (tentativa + 1));
    }

    if (!res || !res.ok) throw new Error(`HTTP ${res?.status ?? 'sem resposta'}`);

    const body = (await res.json()) as { data?: SaldoDoBling[] };
    const mapa = new Map<number, number>();

    for (const linha of body?.data ?? []) {
        const id = linha.produto?.id;
        if (typeof id === 'number' && typeof linha.saldoFisicoTotal === 'number') {
            mapa.set(id, linha.saldoFisicoTotal);
        }
    }

    return mapa;
}

export async function sincronizarSaldos(): Promise<void> {
    if (!TokenService.isBlingConfigured()) {
        console.warn('[BLING ESTOQUE] Bling nao configurado — ciclo ignorado');
        return;
    }

    const token = await TokenService.getAccessToken();
    if (!token) {
        console.warn('[BLING ESTOQUE] sem token — ciclo ignorado');
        return;
    }

    const { rows } = await db.execute<{ bling_id: string }>(
        sql`select distinct bling_id from products_skus where bling_id is not null`,
    );
    const ids = rows.map((r) => Number(r.bling_id)).filter(Number.isFinite);

    if (!ids.length) {
        console.log('[BLING ESTOQUE] nenhum SKU vinculado — nada a fazer');
        return;
    }

    const inicio = Date.now();
    let atualizados = 0;
    let lotesComFalha = 0;

    for (let i = 0; i < ids.length; i += IDS_POR_CHAMADA) {
        const lote = ids.slice(i, i + IDS_POR_CHAMADA);

        let saldos: Map<number, number>;
        try {
            saldos = await saldosDoLote(token, lote);
        } catch (error) {
            // Um lote que falha nao pode derrubar o ciclo: os outros 82 seguem,
            // e este volta no proximo. Estoque velho em 30 SKUs e ruim; estoque
            // velho em 2.483 porque um lote deu timeout e muito pior.
            lotesComFalha++;
            console.error(`[BLING ESTOQUE] lote a partir de ${i} falhou:`, error);
            await pausa(PAUSA_ENTRE_CHAMADAS_MS);
            continue;
        }

        for (const [blingId, saldo] of saldos) {
            // So escreve quando o numero mudou. Sem isto, 2.483 UPDATEs a cada
            // 15 minutos sujam o updated_at de tudo e escondem o que de fato
            // mexeu quando alguem for investigar.
            const r = await db.execute(sql`
                update products_skus
                   set stock_qty = ${saldo}, updated_at = now()
                 where bling_id = ${blingId} and stock_qty <> ${saldo}
            `);
            atualizados += r.rowCount ?? 0;
        }

        await pausa(PAUSA_ENTRE_CHAMADAS_MS);
    }

    // O total do produto e a soma dos SKUs. A vitrine usa este campo para dizer
    // "esgotado", entao ele tem que andar junto — senao o produto continua
    // aparecendo disponivel com todas as variacoes zeradas.
    if (atualizados > 0) {
        await db.execute(sql`
            update products p
               set stock = coalesce((
                     select sum(s.stock_qty) from products_skus s where s.product_id = p.id
                   ), 0)
             where exists (select 1 from products_skus s where s.product_id = p.id)
        `);
    }

    const segundos = Math.round((Date.now() - inicio) / 1000);
    console.log(
        `[BLING ESTOQUE] ciclo: ${ids.length} SKUs consultados, ${atualizados} saldos mudaram, ` +
        `${lotesComFalha} lotes falharam, ${segundos}s`,
    );
}

async function tick(): Promise<void> {
    if (rodando) return; // um ciclo lento nunca encavala no seguinte
    rodando = true;

    try {
        await sincronizarSaldos();
    } catch (error) {
        console.error('[BLING ESTOQUE] ciclo falhou:', error);
    } finally {
        rodando = false;
    }
}

export function startBlingStockSync(intervalMs: number = INTERVALO_MS): void {
    setInterval(tick, intervalMs);
    // 30s depois do boot: deixa o servidor subir e o token resolver antes de
    // disparar 83 chamadas.
    setTimeout(tick, 30 * 1000);
    console.log('[BLING ESTOQUE] ativo — saldo do Bling a cada 15 minutos');
}
