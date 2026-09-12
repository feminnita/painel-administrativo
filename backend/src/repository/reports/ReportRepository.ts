import { sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { reorderSlides } from '../../services/hero/HeroSlideService';

// const PAID_FILTER = sql`o.payment_status = 'paid' AND o.status <> 'cancelled' AND o.created_at >= now() - make_interval(days => ${sql.raw('$1')}::int)`;

export async function salesSummary(days: number) {
    const { rows } = await db.execute(sql`
        SELECT 
            COALESCE(SUM(o.total::numeric), 0)::float AS revenue,
            COUNT(*)::int AS orders,
            COALESCE(SUM(o.discount::numeric), 0)::float AS discounts,
            COALESCE(SUM(o.shipping_cost::numeric), 0)::float AS shipping FROM orders o   
            WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            AND o.created_at >= now() - make_interval(days => ${days}) 
        `);
    return rows[0];
}

export async function salesByDay(days: number) {
    const { rows } = await db.execute(sql`
            SELECT
                to_char(o.created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
                SUM(o.total::numeric)::float AS revenue,
                COUNT(*)::int AS orders
            FROM orders o
            WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
                AND o.created_at >= now() - make_interval(days => ${days})
            GROUP BY 1
            ORDER BY 1
    `);
    return rows;
}

export async function topProducts(days: number, limit = 8) {
    const { rows } = await db.execute(sql`
        SELECT
            i.product_name AS name, 
            SUM(i.quantity)::int AS quantity,
            SUM(i.total_price::numeric)::float AS revenue
        From order_items i
        JOIN orders o ON o.id = i.order_id
        WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            AND o.created_at >= now() - make_interval(days => ${days})
        GROUP BY i.product_name
        ORDER BY revenue DESC
        LIMIT ${limit}
    `);
    return rows;
}

export async function salesByPaymentMethod(days: number) {
    const { rows } = await db.execute(sql`
        SELECT
            COALESCE(o.payment_method, 'desconhecido') AS method,
            COUNT(*)::int AS orders,
            SUM(o.total::numeric)::float AS revenue
        FROM orders o
        WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            AND o.created_at >= now() - make_interval(days => ${days})
        GROUP BY 1
        ORDER BY revenue DESC
    `);
    return rows;
}

export async function itemsSold(days: number) {
    const { rows } = await db.execute(sql`
        SELECT COALESCE(SUM(i.quantity), 0)::int AS items
        FROM order_items i
        JOIN orders o ON o.id = i.order_id
        WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            AND o.created_at >= now() - make_interval(days => ${days})
    `);
    return rows[0];
}

export async function productVisits(limit = 50) {
    const { rows } = await db.execute(sql`
     SELECT
            p.id,
            p.name,
            p.view_count::int AS visits,
            p.active,
            CASE WHEN jsonb_typeof(p.images) = 'array'
                THEN p.images->>0 ELSE NULL END AS image,
            COALESCE(SUM(i.quantity) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ), 0)::int AS sold,
            COALESCE(SUM(i.total_price::numeric) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ), 0)::float AS revenue
        FROM products p
        LEFT JOIN order_items i ON i.product_id = p.id
        LEFT JOIN orders o ON o.id = i.order_id
        WHERE p.view_count > 0
        GROUP BY p.id
        ORDER BY p.view_count DESC
        LIMIT ${limit}
        
    `);
    return rows;
}
// O que as clientes procuraram na loja e NAO acharam.
//
// Vem da tabela store_events, que a vitrine passou a alimentar em 12/09/2026.
// Antes disso o unico rastro era products.view_count — um contador sem data e
// sem sessao, que nao responde "o que ela queria e nao tinha".
//
// Cada linha aqui e um pedido de compra que a loja recusou por falta de
// cadastro: ou a peca nao existe (e e demanda), ou existe com outro nome (e e
// problema de nome). As duas leituras valem dinheiro.
export async function buscasSemResultado(dias = 30, limite = 50) {
    const { rows } = await db.execute(sql`
        SELECT
            term                                AS termo,
            COUNT(*)::int                       AS vezes,
            COUNT(DISTINCT session_id)::int     AS visitas,
            MAX(created_at)                     AS ultima
        FROM store_events
        WHERE type = 'search'
          AND result_count = 0
          AND term IS NOT NULL
          AND created_at >= now() - make_interval(days => ${dias}::int)
        GROUP BY term
        ORDER BY vezes DESC, visitas DESC
        LIMIT ${limite}
    `);
    return rows;
}

// Quantas buscas houve no periodo e quantas terminaram em nada.
// Sem esse denominador a lista acima nao diz se e um problema grande ou um caso
// isolado: "12 buscas sem resultado" pesa diferente em 20 ou em 2000 buscas.
export async function resumoDeBuscas(dias = 30) {
    const { rows } = await db.execute(sql`
        SELECT
            COUNT(*)::int                                        AS total,
            COUNT(*) FILTER (WHERE result_count = 0)::int        AS sem_resultado,
            COUNT(DISTINCT session_id)::int                      AS visitas_que_buscaram
        FROM store_events
        WHERE type = 'search'
          AND created_at >= now() - make_interval(days => ${dias}::int)
    `);
    return rows[0] ?? { total: 0, sem_resultado: 0, visitas_que_buscaram: 0 };
}
