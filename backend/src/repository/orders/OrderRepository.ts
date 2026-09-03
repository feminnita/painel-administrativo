import { desc, eq, sql, and, inArray, isNull, ne, gte, lte, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../../config/db';
import { orders, orderItems, productsSkus, coupons, customers, products, categories, orderStatusHistory, orderNotes } from '../../config/db/schema';

// Colunas do item + codigo interno do produto (join). Reutilizado na lista e no
// detalhe para o romaneio ter "Codigo" e montar a Ref.
const orderItemSelect = {
    id: orderItems.id,
    orderId: orderItems.orderId,
    productId: orderItems.productId,
    skuId: orderItems.skuId,
    productName: orderItems.productName,
    productImage: orderItems.productImage,
    color: orderItems.color,
    size: orderItems.size,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    totalPrice: orderItems.totalPrice,
    productCode: products.code,
    // Ordem de separacao (fila do estoque) da categoria do produto. Usada no
    // romaneio para ordenar os itens na sequencia das prateleiras.
    categoryPickOrder: categories.pickOrder,
} as const;

export type OrderListFilters = {
    status?: typeof orders.$inferSelect['status'];
    search?: string;
    from?: string;
    to?: string;
    includeCancelled?: boolean;
};


export function findAll() {
    return db.query.orders.findMany({ orderBy: [desc(orders.createdAt)] });
}

export function findById(id: string) {
    return db.query.orders.findFirst({ where: eq(orders.id, id) })
}

export function findItemsByOrderId(orderId: string) {
    return db
        .select(orderItemSelect)
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(orderItems.orderId, orderId));
}

// --- Impressao: flag de ja-impresso (NAO mexe em estoque/situacao) ---

export async function markPrinted(ids: string[], printedBy: string) {
    if (!ids.length) return [];
    return db
        .update(orders)
        .set({ printedAt: new Date(), printedBy, updatedAt: new Date() })
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id, printedAt: orders.printedAt, printedBy: orders.printedBy });
}

export async function clearPrinted(ids: string[]) {
    if (!ids.length) return [];
    return db
        .update(orders)
        .set({ printedAt: null, printedBy: null, updatedAt: new Date() })
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id });
}

// --- Observacoes internas (append-only, com autor + data/hora) ---

export async function insertOrderNote(entry: { orderId: string; author: string; body: string }) {
    const [row] = await db.insert(orderNotes).values(entry).returning();
    return row;
}

export function findOrderNotes(orderId: string) {
    return db.query.orderNotes.findMany({
        where: eq(orderNotes.orderId, orderId),
        orderBy: [desc(orderNotes.createdAt)],
    });
}

// --- Sobrescrita de status (override) + auditoria ---

export async function setStatusOverride(id: string, override: string | null) {
    const [order] = await db
        .update(orders)
        .set({ statusOverride: override, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
    return order ?? null;
}

export async function insertStatusHistory(entry: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    source: string;
}) {
    const [row] = await db
        .insert(orderStatusHistory)
        .values(entry)
        .returning();
    return row;
}

export function findStatusHistory(orderId: string) {
    return db.query.orderStatusHistory.findMany({
        where: eq(orderStatusHistory.orderId, orderId),
        orderBy: [desc(orderStatusHistory.createdAt)],
    });
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


export async function findAllWithRelations(filters: OrderListFilters = {}) {
    const conds: SQL[] = [];

    if (filters.status) {
        conds.push(eq(orders.status, filters.status));
    } else if (!filters.includeCancelled) {
        // Fila de trabalho: cancelados/falhados nao poluem a visao principal
        conds.push(ne(orders.status, 'cancelled'));
        conds.push(ne(orders.paymentStatus, 'failed'));
    }

    if (filters.from) {
        conds.push(gte(orders.createdAt, new Date(`${filters.from}T00:00:00`)));
    }
    if (filters.to) {
        conds.push(lte(orders.createdAt, new Date(`${filters.to}T23:59:59.999`)));
    }
    if (filters.search) {
        const term = `%${filters.search}%`;
        conds.push(or(ilike(orders.orderNumber, term), ilike(orders.trackingCode, term)) as SQL);
    }

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
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(orders.createdAt));

    const orderIds = rows.map((r) => r.order.id);
    const items = orderIds.length
        ? await db
              .select(orderItemSelect)
              .from(orderItems)
              .leftJoin(products, eq(orderItems.productId, products.id))
              .leftJoin(categories, eq(products.categoryId, categories.id))
              .where(inArray(orderItems.orderId, orderIds))
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

export function findPaidOrdersWithoutBling() {
    return db.query.orders.findMany({
        where: and(
            eq(orders.paymentStatus, 'paid'),
            isNull(orders.blingOrderId),
            ne(orders.status, 'cancelled'),
        ),
        orderBy: [desc(orders.createdAt)],
        limit: 20,
    });
}

export async function saveBlingOrderId(orderId: string, blingOrderId: number) {
    const [order] = await db
        .update(orders)
        .set({ blingOrderId, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}

export function findPaidOrdersToPush() {
    return db
        .select({ id: orders.id, orderNumber: orders.orderNumber })
        .from(orders)
        .where(and(
            eq(orders.paymentStatus, 'paid'),
            isNull(orders.blingOrderId),
            or(isNull(orders.blingPushStatus), eq(orders.blingPushStatus, 'pending')),
        ))
        .orderBy(desc(orders.createdAt))
        .limit(20);
}

export async function markPushed(orderId: string) {
    const [order] = await db
        .update(orders)
        .set({
            blingPushStatus: 'pushed',
            blingPushError: null,
            blingPushedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}

export async function saveBlingPushError(orderId: string, message: string) {
    const [order] = await db
        .update(orders)
        .set({
            blingPushStatus: 'error',
            blingPushError: message,
            updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}

export async function resetPushToPending(orderId: string) {
    const [order] = await db
        .update(orders)
        .set({
            blingPushStatus: 'pending',
            blingPushError: null,
            updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}