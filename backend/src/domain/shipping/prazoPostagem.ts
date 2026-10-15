/**
 * Prazo para o pacote ser BIPADO (recebido no ponto ou postado na
 * transportadora), contado em dias uteis a partir da compra.
 *
 * Regra da Chris (15/10/2026): pedido de segunda tem que estar bipado na
 * terca, no maximo na quarta. Sabado e domingo nao contam: compra de sexta
 * vence na terca (a segunda costuma chegar cheia). Compra no fim de semana
 * conta como chegada na segunda.
 *
 *   inicio = dia da compra, ou o proximo dia util se caiu em fim de semana/feriado
 *   esperado = inicio + 1 dia util   (o normal)
 *   limite   = inicio + 2 dias uteis (passou disso, esta atrasado)
 *
 * Por que existe: em 15/10/2026 a Claramel ficava com os pacotes no balcao sem
 * bipar, e a loja so descobria quando a cliente reclamava.
 *
 * Datas sao dias do calendario de Brasilia, no formato AAAA-MM-DD.
 */

// Feriados nacionais de data fixa. Os moveis (Carnaval, Sexta-feira Santa,
// Corpus Christi) nao estao aqui: num desses o painel pode acusar atraso de
// um dia que nao houve.
const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

export function diaEmBrasilia(momento: Date | string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(momento));
}

function somarDias(dia: string, n: number): string {
    const d = new Date(`${dia}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export function ehDiaUtil(dia: string): boolean {
    const semana = new Date(`${dia}T12:00:00Z`).getUTCDay();
    return semana !== 0 && semana !== 6 && !FERIADOS_FIXOS.includes(dia.slice(5));
}

function proximoDiaUtil(dia: string): string {
    let d = somarDias(dia, 1);
    while (!ehDiaUtil(d)) d = somarDias(d, 1);
    return d;
}

export function prazosDaCompra(compra: Date | string) {
    let inicio = diaEmBrasilia(compra);
    if (!ehDiaUtil(inicio)) inicio = proximoDiaUtil(inicio);
    const esperado = proximoDiaUtil(inicio);
    const limite = proximoDiaUtil(esperado);
    return { inicio, esperado, limite };
}

/** Dias uteis entre dois dias (quantos dias uteis depois de `de` esta `ate`). */
export function diasUteisEntre(de: string, ate: string): number {
    let n = 0;
    let d = de;
    while (d < ate) {
        d = somarDias(d, 1);
        if (ehDiaUtil(d)) n++;
    }
    return n;
}

export type SituacaoPostagem = 'no_prazo' | 'vence_hoje' | 'atrasado' | 'bipado' | 'bipado_com_atraso';

export function situacaoDaPostagem(compra: Date | string, bipadoEm: Date | string | null, agora: Date = new Date()) {
    const { limite } = prazosDaCompra(compra);
    if (bipadoEm) {
        const dia = diaEmBrasilia(bipadoEm);
        return { situacao: (dia > limite ? 'bipado_com_atraso' : 'bipado') as SituacaoPostagem, limite, diasDeAtraso: dia > limite ? diasUteisEntre(limite, dia) : 0 };
    }
    const hoje = diaEmBrasilia(agora);
    if (hoje > limite) return { situacao: 'atrasado' as SituacaoPostagem, limite, diasDeAtraso: diasUteisEntre(limite, hoje) };
    if (hoje === limite) return { situacao: 'vence_hoje' as SituacaoPostagem, limite, diasDeAtraso: 0 };
    return { situacao: 'no_prazo' as SituacaoPostagem, limite, diasDeAtraso: 0 };
}
