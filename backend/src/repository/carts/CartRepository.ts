import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { carts, customers, products } from '../../config/db/schema';

export function findAbandoned(minMinutes: number) {
    return db
        .select({
            customerId: carts.customerId,
            items: carts.items,
            updatedAt: carts.updatedAt,
            customerName: customers.name,
            customerEmail: customers.email,
            customerPhone: customers.phone,
        })
        .from(carts)
        .innerJoin(customers, eq(carts.customerId, customers.id))
        .where(sql`jsonb_array_length(${carts.items}) > 0
            AND ${carts.updatedAt} < now() - (${minMinutes} * interval '1 minute')`)
        .orderBy(desc(carts.updatedAt));
}

export function findProductsByIds(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return db.query.products.findMany({
        where: inArray(products.id, ids),
        columns: {
            id: true,
            name: true,
            basePrice: true,
            salePrice: true,
            images: true,
        },
    });
}
