import { Request, Response } from 'express';
import * as CampanhasRepository from '../../repository/campanhas/CampanhasRepository';
import * as MetaAds from '../../integrations/meta/MetaAdsService';

/**
 * Junta o que so a Meta sabe (o gasto) com o que so a loja sabe (a venda que
 * aconteceu de verdade) e classifica cada arte.
 *
 * As duas regras vem de UMA decisao da Chris: a publicidade cabe em 5% do preco.
 * Dela saem as duas fronteiras, sem numero inventado:
 *   - retorno alvo = 1 / 0,05 = 20 reais de receita por real gasto;
 *   - orcamento de publicidade de UMA venda = 5% do ticket medio. Passou disso
 *     sem vender, o anuncio estourou o que estava reservado para conseguir a venda.
 *
 * Se a fatia mudar, muda so a constante — as duas fronteiras se movem juntas.
 */
const FATIA_PUBLICIDADE = 0.05;

export type Classificacao = 'vencedor' | 'promissor' | 'cansado' | 'morto' | 'abaixo da meta';

function classificar(entrada: {
    gasto30: number;
    gasto7: number;
    pedidos30: number;
    pedidos7: number;
    receita30: number;
    gastoMinimo: number;
    retornoAlvo: number;
}): { classe: Classificacao; porque: string } {
    const { gasto30, gasto7, pedidos30, pedidos7, receita30, gastoMinimo, retornoAlvo } = entrada;
    const retorno = gasto30 > 0 ? receita30 / gasto30 : 0;

    if (gasto30 === 0) {
        return { classe: 'promissor', porque: 'Nao gastou nada nos ultimos 30 dias.' };
    }
    if (pedidos30 === 0) {
        return gasto30 < gastoMinimo
            ? {
                classe: 'promissor',
                porque: `Gastou R$ ${gasto30.toFixed(2)} e ainda nao vendeu, mas nem chegou aos R$ ${gastoMinimo.toFixed(2)} que voce reserva por venda. Cedo para julgar.`,
            }
            : {
                classe: 'morto',
                porque: `Gastou R$ ${gasto30.toFixed(2)} sem nenhuma venda — ja passou os R$ ${gastoMinimo.toFixed(2)} reservados para conseguir uma.`,
            };
    }
    // Vendeu no mes, parou de vender na semana, e continua gastando: e o cansaco.
    // Sem gasto na semana nao da para chamar de cansado — pode so ter sido pausado.
    if (pedidos7 === 0 && gasto7 > 0) {
        return {
            classe: 'cansado',
            porque: `Vendeu ${pedidos30}x no mes, mas nenhuma vez nos ultimos 7 dias, e segue gastando R$ ${gasto7.toFixed(2)} na semana. Vale arte nova do mesmo tema.`,
        };
    }
    if (retorno >= retornoAlvo) {
        return { classe: 'vencedor', porque: `Retorno ${retorno.toFixed(1)}, acima do alvo de ${retornoAlvo}.` };
    }
    return {
        classe: 'abaixo da meta',
        porque: `Vende, mas o retorno e ${retorno.toFixed(1)} — abaixo do alvo de ${retornoAlvo}. A publicidade esta levando ${(100 / retorno).toFixed(1)}% da receita, contra os ${(FATIA_PUBLICIDADE * 100).toFixed(0)}% orcados.`,
    };
}

const diasAtras = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const hoje = () => new Date().toISOString().slice(0, 10);

export async function desempenho(_req: Request, res: Response) {
    if (!MetaAds.metaConfigurada()) {
        return res.json({
            conectada: false,
            aviso:
                'Meta nao conectada. Falta META_ADS_TOKEN e META_AD_ACCOUNT_ID no ambiente. ' +
                'Use token de System User: o de usuario vence em 60 dias e a tela para de atualizar sem avisar.',
            artes: [],
        });
    }

    let gastos: MetaAds.GastoPorArte[] = [];
    let erroDaMeta: string | null = null;
    try {
        gastos = await MetaAds.gastoPorArte();
    } catch (e) {
        // A Meta fora do ar nao pode derrubar a tela: a receita daqui continua valendo.
        erroDaMeta = e instanceof Error ? e.message : String(e);
    }

    const [vendas30, vendas7] = await Promise.all([
        CampanhasRepository.porArte(diasAtras(30), hoje()),
        CampanhasRepository.porArte(diasAtras(7), hoje()),
    ]);

    const soma = (linhas: { arte: string | null; pedidos: number; receita: number }[]) => {
        const m = new Map<string, { pedidos: number; receita: number }>();
        for (const l of linhas) {
            const chave = l.arte ?? '(sem etiqueta)';
            const a = m.get(chave) ?? { pedidos: 0, receita: 0 };
            a.pedidos += Number(l.pedidos ?? 0);
            a.receita += Number(l.receita ?? 0);
            m.set(chave, a);
        }
        return m;
    };
    const m30 = soma(vendas30 as never);
    const m7 = soma(vendas7 as never);

    const totalPedidos = [...m30.values()].reduce((s, v) => s + v.pedidos, 0);
    const totalReceita = [...m30.values()].reduce((s, v) => s + v.receita, 0);
    const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
    const gastoMinimo = Number((ticketMedio * FATIA_PUBLICIDADE).toFixed(2));
    const retornoAlvo = Math.round(1 / FATIA_PUBLICIDADE);

    const chaves = new Set<string>([...gastos.map((g) => g.arte), ...m30.keys()]);
    const artes = [...chaves].map((arte) => {
        const g = gastos.find((x) => x.arte === arte);
        const v30 = m30.get(arte) ?? { pedidos: 0, receita: 0 };
        const v7 = m7.get(arte) ?? { pedidos: 0, receita: 0 };
        const gasto30 = g?.gasto30 ?? 0;
        const gasto7 = g?.gasto7 ?? 0;
        const { classe, porque } = classificar({
            gasto30, gasto7,
            pedidos30: v30.pedidos, pedidos7: v7.pedidos, receita30: v30.receita,
            gastoMinimo, retornoAlvo,
        });
        return {
            arte,
            gasto7, gasto30,
            cliques30: g?.cliques30 ?? 0,
            impressoes30: g?.impressoes30 ?? 0,
            pedidos30: v30.pedidos,
            pedidos7: v7.pedidos,
            receita30: Number(v30.receita.toFixed(2)),
            custoPorCompra: v30.pedidos > 0 ? Number((gasto30 / v30.pedidos).toFixed(2)) : null,
            retorno: gasto30 > 0 ? Number((v30.receita / gasto30).toFixed(2)) : null,
            anuncios: g?.anuncios ?? [],
            classe, porque,
        };
    }).sort((a, b) => b.gasto30 - a.gasto30);

    const gastoTotal = artes.reduce((s, a) => s + a.gasto30, 0);
    const receitaAtribuida = artes.filter((a) => a.arte !== '(sem etiqueta)').reduce((s, a) => s + a.receita30, 0);

    res.json({
        conectada: true,
        erroDaMeta,
        regra: {
            fatiaPublicidade: FATIA_PUBLICIDADE,
            retornoAlvo,
            gastoMinimo,
            ticketMedio: Number(ticketMedio.toFixed(2)),
            explicacao:
                `Voce orca ${(FATIA_PUBLICIDADE * 100).toFixed(0)}% do preco para publicidade. ` +
                `Isso da retorno alvo ${retornoAlvo} e orcamento de R$ ${gastoMinimo.toFixed(2)} por venda ` +
                `(${(FATIA_PUBLICIDADE * 100).toFixed(0)}% do ticket medio de R$ ${ticketMedio.toFixed(2)}).`,
        },
        resumo: {
            gasto30: Number(gastoTotal.toFixed(2)),
            receitaAtribuida: Number(receitaAtribuida.toFixed(2)),
            retornoGeral: gastoTotal > 0 ? Number((receitaAtribuida / gastoTotal).toFixed(2)) : null,
            fatiaReal: receitaAtribuida > 0 ? Number(((gastoTotal / receitaAtribuida) * 100).toFixed(1)) : null,
        },
        artes,
    });
}
