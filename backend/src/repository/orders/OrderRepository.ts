import { desc, eq, sql, and, inArray } from 'drizzle-orm';
import { db } from '../../config/db';
import { orders, orderItems, productsSkus, coupons, customers, products } from '../../config/db/schema';


export function findAll() {
    return db.query.orders.findMany({ orderBy: [desc(orders.createdAt)] });
}

export function findById(id: string) {
    return db.query.orders.findFirst({ where: eq(orders.id, id) })
}

export function findItemsByOrderId(orderId: string) {
    return db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) })
}


export async function updateStatus(
    id: string,
    values: {
        status?: typeof orders.$inferSelect['status'];
        paymentStatus?: typeof orders.$inferSelect['paymentStatus']
    }
) {
    const [order] = await db
        .update(orders)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
    return order;
}

export function confirmSkuSale(skuId: string, quantity: number) {
    return db
        .update(productsSkus)
        .set({
            stockQty: sql`GREATEST(${productsSkus.stockQty} - ${quantity}, 0)`,
            reservedQty: sql`GREATEST(${productsSkus.reservedQty} - ${quantity}, 0)`,
            updatedAt: new Date(),
        })
        .where(eq(productsSkus.id, skuId));
}

export function releaseSkuReservation(skuId: string, quantity: number) {
    return db
        .update(productsSkus)
        .set({
            reservedQty: sql`GREATEST(${productsSkus.reservedQty} - ${quantity}, 0)`,
            updatedAt: new Date(),
        })
        .where(eq(productsSkus.id, skuId));
}

export function findUnpaidPendingOrders() {
    return db.query.orders.findMany({
        where: and(eq(orders.status, 'pending'), eq(orders.paymentStatus, 'pending')),
    })
}

export async function cancelIfStillUnpaid(id: string) {
    const [order] = await db
        .update(orders)
        .set({
            status: 'cancelled',
            updatedAt: new Date(),
        })
        .where(and(
            eq(orders.id, id),
            eq(orders.status, 'pending'),
            eq(orders.paymentStatus, 'pending')
        ))
        .returning();

    return order ?? null;
}

export function findCustomerById(id: string) {
    return db.query.customers.findFirst({
        where: eq(customers.id, id),
        columns: {
            id: true,
            name: true,
            email: true
        },
    });
}

export function findCustomerForShipping(id: string) {
    return db.query.customers.findFirst({
        where: eq(customers.id, id),
        columns: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true
        },
    });
}

export async function saveLabelInfo(orderId: string, info: {
    meOrderId: string;
    labelUrl: string;
    trackingCode: string | null
}) {

    const [order] = await db
        .update(orders)
        .set({
            meOrderId: info.meOrderId,
            labelUrl: info.labelUrl,
            labelGeneratedAt: new Date(),
            trackingCode: info.trackingCode,
            updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();
    return order;
}

export function findItemsWithProducts(orderId: string) {
    return db
        .select({
            quantity: orderItems.quantity,
            weightKg: products.weightKg,
            pkgHeightCm: products.pkgHeightCm,
            pkgWidthCm: products.pkgWidthCm,
            pkgLengthCm: products.pkgLengthCm,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));
}

export async function saveShippedAt(orderId: string) {
    const [order] = await db
        .update(orders)
        .set({ shippedAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();
    return order;
}


export async function saveTrackingCode(orderId: string, trackingCode: string) {

    const [order] = await db
        .update(orders)
        .set({
            trackingCode,
            trackingUrl: `https://www.melhorrastreio.com.br/rastreio/${trackingCode}`,
            updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();
    return order;
}


export async function findAllWithRelations() {
    const rows = await db
        .select({
            order: orders,
            customerName: customers.name,
            customerEmail: customers.email,
            customerPhone: customers.phone,
            customerCpf: customers.cpf,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .orderBy(desc(orders.createdAt));

    const orderIds = rows.map((r) => r.order.id);
    const items = orderIds.length
        ? await db.query.orderItems.findMany({ where: inArray(orderItems.orderId, orderIds) })
        : [];

    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
        const list = itemsByOrder.get(item.orderId!) ?? [];
        list.push(item);
        itemsByOrder.set(item.orderId!, list);
    }

    return rows.map((r) => ({
        ...r.order,
        customerName: r.customerName ?? '',
        customerEmail: r.customerEmail ?? '',
        customerPhone: r.customerPhone ?? '',
        customerCpf: r.customerCpf ?? '',
        items: itemsByOrder.get(r.order.id) ?? [],
    }));
}

export function findItemsForBling(orderId: string) {
    return db
        .select({
            productName: orderItems.productName,
            unitPrice: orderItems.unitPrice,
            quantity: orderItems.quantity,
            size: orderItems.size,
            color: orderItems.color,
            productCode: products.code,
            productBlingId: products.blingId,
            skuBlingId: productsSkus.blingId,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(productsSkus, eq(orderItems.skuId, productsSkus.id))
        .where(eq(orderItems.orderId, orderId));
}

export async function saveBlingOrderId(orderId: string, blingOrderId: number) {
    const [order] = await db
        .update(orders)
        .set({ blingOrderId, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}