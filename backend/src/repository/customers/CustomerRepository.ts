import { eq, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { customers } from '../../config/db/schema';

export async function listWithStatus() {
    const { rows } = await db.execute(sql`
         SELECT
            c.id,
            c.name,
            c.email,
            c.phone,
            c.cpf,
            c.created_at AS "createdAt",
            COUNT(o.id) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            )::int AS "paidOrders",
            COALESCE(SUM(o.total::numeric) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ), 0)::float AS "totalSpent",
            MAX(o.created_at) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ) AS "lastOrderAt"
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `);
    return rows;
}

export function findById(id: string) {
    return db.query.customers.findFirst({
        where: eq(customers.id, id),
        columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            cpf: true,
            birthDate: true,
            createdAt: true,
        },
    });
}

export async function ordersByCustomer(customerId: string) {
    const { rows } = await db.execute(sql`
             SELECT
            o.id,
            o.order_number AS "orderNumber",
            o.status,
            o.payment_status AS "paymentStatus",
            o.payment_method AS "paymentMethod",
            o.total::float AS total,
            o.created_at AS "createdAt",
            COALESCE(SUM(i.quantity), 0)::int AS items
        FROM orders o
        LEFT JOIN order_items i ON i.order_id = o.id
        WHERE o.customer_id = ${customerId}
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `);
    return rows;
}