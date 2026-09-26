/**
 * Gasto de anuncio da Meta, agrupado pela ARTE (o utm_content do link).
 *
 * Por que pelo utm_content e nao pelo nome do conjunto: o nome e texto livre e
 * muda quando a Chris renomeia; o utm_content e o que chega gravado no pedido.
 * Casando pelos dois lados pela MESMA chave, gasto e receita falam do mesmo anuncio.
 *
 * As compras NAO vem daqui. Vem do pedido no banco (CampanhasRepository). A Meta
 * infla atribuicao: conta como venda dela quem ja ia comprar. O que a Meta tem de
 * unico e o custo — e so isso que se pega aqui.
 *
 * As credenciais sao OPCIONAIS de proposito. Nao entram no env.ts: se entrassem
 * como obrigatorias, o painel inteiro deixaria de subir no dia em que o token
 * fosse removido. Sem token, a tela mostra "nao conectado" e o resto continua.
 */

const BASE = 'https://graph.facebook.com';

// A Meta aposenta versao de API a cada ~2 anos e o erro que ela devolve e obscuro.
// Deixar em variavel permite subir a versao sem deploy de codigo.
const VERSAO = process.env.META_API_VERSION ?? 'v21.0';

export type GastoPorArte = {
    arte: string;
    gasto7: number;
    gasto30: number;
    cliques30: number;
    impressoes30: number;
    anuncios: string[];
};

export function metaConfigurada(): boolean {
    return Boolean(process.env.META_ADS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

function conta(): string {
    const id = String(process.env.META_AD_ACCOUNT_ID ?? '');
    return id.startsWith('act_') ? id : `act_${id}`;
}

async function busca<T = any>(caminho: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE}/${VERSAO}/${caminho}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', String(process.env.META_ADS_TOKEN));

    const r = await fetch(url);
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = (corpo as any)?.error?.message ?? `HTTP ${r.status}`;
        // O erro mais comum aqui e token vencido: o de usuario da Meta dura 60 dias.
        // Dizer isso na mensagem evita meia hora procurando bug onde nao ha.
        throw new Error(
            `Meta recusou: ${msg}. Se fala em token, ele provavelmente venceu — ` +
            `token de usuario dura 60 dias. Trocar por token de System User, que nao vence.`,
        );
    }
    return corpo as T;
}

/** Percorre todas as paginas. Conta pequena cabe numa, mas nao da para contar com isso. */
async function todas<T = any>(caminho: string, params: Record<string, string>): Promise<T[]> {
    let pagina = await busca<{ data: T[]; paging?: { next?: string } }>(caminho, params);
    const itens = [...(pagina.data ?? [])];
    let proxima = pagina.paging?.next;
    let guarda = 0;
    while (proxima && guarda++ < 20) {
        const r = await fetch(proxima);
        if (!r.ok) break;
        pagina = await r.json();
        itens.push(...(pagina.data ?? []));
        proxima = pagina.paging?.next;
    }
    return itens;
}

/** Le o utm_content do link de cada anuncio. E a chave que liga gasto a venda. */
function arteDoAnuncio(anuncio: any): string | null {
    const tags: string = anuncio?.creative?.url_tags ?? '';
    const achado = /(?:^|&)utm_content=([^&]+)/.exec(tags);
    return achado ? decodeURIComponent(achado[1]) : null;
}

/**
 * Gasto por arte em 7 e 30 dias.
 *
 * Anuncio SEM utm_content cai em "(sem etiqueta)" em vez de ser descartado. Some-lo
 * seria pior que mostra-lo: esconderia verba gasta. Foi o caso da BIDCAP, que sozinha
 * levava 47% do mes sem nenhuma venda rastreavel.
 */
export async function gastoPorArte(): Promise<GastoPorArte[]> {
    if (!metaConfigurada()) return [];

    const anuncios = await todas(`${conta()}/ads`, {
        fields: 'id,name,creative{url_tags}',
        limit: '200',
        // Pausado entra: anuncio desligado ontem gastou esse mes e precisa aparecer no relatorio.
        effective_status: '["ACTIVE","PAUSED","ADSET_PAUSED","CAMPAIGN_PAUSED"]',
    });

    const arteDe = new Map<string, string>();
    const nomeDe = new Map<string, string>();
    for (const a of anuncios) {
        arteDe.set(String(a.id), arteDoAnuncio(a) ?? '(sem etiqueta)');
        nomeDe.set(String(a.id), a.name ?? String(a.id));
    }

    const periodo = async (preset: string) =>
        todas(`${conta()}/insights`, {
            level: 'ad',
            date_preset: preset,
            fields: 'ad_id,spend,clicks,impressions',
            limit: '500',
        });

    const [de7, de30] = await Promise.all([periodo('last_7d'), periodo('last_30d')]);

    const acumulado = new Map<string, GastoPorArte>();
    const pegue = (arte: string) => {
        if (!acumulado.has(arte)) {
            acumulado.set(arte, { arte, gasto7: 0, gasto30: 0, cliques30: 0, impressoes30: 0, anuncios: [] });
        }
        return acumulado.get(arte)!;
    };

    for (const linha of de30) {
        const arte = arteDe.get(String(linha.ad_id)) ?? '(sem etiqueta)';
        const alvo = pegue(arte);
        alvo.gasto30 += Number(linha.spend ?? 0);
        alvo.cliques30 += Number(linha.clicks ?? 0);
        alvo.impressoes30 += Number(linha.impressions ?? 0);
        const nome = nomeDe.get(String(linha.ad_id));
        if (nome && !alvo.anuncios.includes(nome)) alvo.anuncios.push(nome);
    }
    for (const linha of de7) {
        pegue(arteDe.get(String(linha.ad_id)) ?? '(sem etiqueta)').gasto7 += Number(linha.spend ?? 0);
    }

    return [...acumulado.values()]
        .map((x) => ({ ...x, gasto7: Number(x.gasto7.toFixed(2)), gasto30: Number(x.gasto30.toFixed(2)) }))
        .sort((a, b) => b.gasto30 - a.gasto30);
}
