import { and, gte, isNotNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { orders } from '../../config/db/schema';

// Desempenho por campanha e por ARTE, medido pelas vendas da propria loja.
//
// Por que assim e nao pela API da Meta: aqui o numero e venda que aconteceu, nao
// conversao que a plataforma diz ter feito. E nao depende de token que vence e
// deixa a tela em branco sem avisar.
//
// So conta pedido PAGO: pedido pendente que nunca foi pago nao e venda, e contar
// ele faria uma arte ruim parecer boa.
const PAGO = sql`${orders.paymentStatus} = 'paid'`;

function periodo(de?: string, ate?: string) {
    const partes = [PAGO];
    if (de) partes.push(gte(orders.createdAt, new Date(`${de}T00:00:00`)));
    if (ate) partes.push(lte(orders.createdAt, new Date(`${ate}T23:59:59`)));
    return and(...partes);
}

// Pedido que veio de algum lugar identificavel: tem utm ou ao menos referencia.
const TEM_ORIGEM = or(isNotNull(orders.utmSource), isNotNull(orders.utmCampaign), isNotNull(orders.referrer));

export async function porCampanha(de?: string, ate?: string) {
    return db
        .select({
            campanha: sql<string>`coalesce(nullif(${orders.utmCampaign}, ''), '(sem campanha)')`,
            origem: sql<string>`coalesce(nullif(${orders.utmSource}, ''), '(direto)')`,
            pedidos: sql<number>`count(*)::int`,
            receita: sql<number>`coalesce(sum(${orders.total}), 0)::float`,
            ticket: sql<number>`coalesce(avg(${orders.total}), 0)::float`,
        })
        .from(orders)
        .where(and(periodo(de, ate), TEM_ORIGEM))
        .groupBy(sql`1`, sql`2`)
        .orderBy(sql`3 desc`);
}

// A pergunta que importa: QUAL ARTE esta vendendo. utm_content e o campo que os
// anuncios usam para identificar o criativo.
export async function porArte(de?: string, ate?: string) {
    return db
        .select({
            arte: sql<string>`nullif(${orders.utmContent}, '')`,
            campanha: sql<string>`coalesce(nullif(${orders.utmCampaign}, ''), '(sem campanha)')`,
            pedidos: sql<number>`count(*)::int`,
            receita: sql<number>`coalesce(sum(${orders.total}), 0)::float`,
            ticket: sql<number>`coalesce(avg(${orders.total}), 0)::float`,
        })
        .from(orders)
        .where(and(periodo(de, ate), isNotNull(orders.utmContent), ne(orders.utmContent, '')))
        .groupBy(sql`1`, sql`2`)
        .orderBy(sql`4 desc`);
}

export async function resumo(de?: string, ate?: string) {
    const [linha] = await db
        .select({
            pedidos: sql<number>`count(*)::int`,
            receita: sql<number>`coalesce(sum(${orders.total}), 0)::float`,
            comOrigem: sql<number>`count(*) filter (where ${orders.utmSource} is not null or ${orders.utmCampaign} is not null)::int`,
            campanhas: sql<number>`count(distinct nullif(${orders.utmCampaign}, ''))::int`,
            artes: sql<number>`count(distinct nullif(${orders.utmContent}, ''))::int`,
        })
        .from(orders)
        .where(periodo(de, ate));
    return linha ?? { pedidos: 0, receita: 0, comOrigem: 0, campanhas: 0, artes: 0 };
}

// Quando nao ha utm, sobra a referencia: de qual site a pessoa veio. Serve para
// medir o organico do Instagram e do Google, que nao passam por anuncio.
export async function porReferencia(de?: string, ate?: string) {
    return db
        .select({
            de: sql<string>`coalesce(nullif(regexp_replace(${orders.referrer}, '^https?://(www\\.)?([^/]+).*$', '\\2'), ''), '(direto)')`,
            pedidos: sql<number>`count(*)::int`,
            receita: sql<number>`coalesce(sum(${orders.total}), 0)::float`,
        })
        .from(orders)
        .where(and(periodo(de, ate), sql`${orders.utmCampaign} is null`))
        .groupBy(sql`1`)
        .orderBy(sql`2 desc`);
}
