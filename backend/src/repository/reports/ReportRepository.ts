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