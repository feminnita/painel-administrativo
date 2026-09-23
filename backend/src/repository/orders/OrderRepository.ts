import { desc, eq, sql, and, inArray, isNull, isNotNull, ne, gte, lte, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../../config/db';
import { orders, orderItems, productsSkus, coupons, customers, products } from '../../config/db/schema';

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

// O CODIGO do produto vem junto: a lista de separacao se le pelo codigo, nao
// pelo nome. "Pijama Curto Feminino Suede Premium Short e Blusa Verao" nao
// distingue nada na prateleira; 53320 distingue.
export async function findItemsByOrderId(orderId: string) {
    const linhas = await db
        .select({
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
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.productId))
        .where(eq(orderItems.orderId, orderId));

    return linhas;
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

// Guarda so a referencia do carrinho do Melhor Envio. Ainda nao ha etiqueta:
// ela so existe depois que a Chris paga o carrinho por la.
export async function saveMeOrderId(orderId: string, meOrderId: string) {
    const [order] = await db
        .update(orders)
        .set({ meOrderId, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

    return order;
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
    // O join com products existe por causa do CODIGO. Sem ele, quem imprime a
    // folha de separacao PELA LISTA recebia item sem productCode e a coluna
    // Codigo saia "—" em todas as linhas — justamente o numero que a equipe
    // usa para achar a peca na prateleira. Imprimir de dentro do pedido
    // funcionava, pela lista nao, e nada na tela dizia por que.
    const items = orderIds.length
        ? await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                productId: orderItems.productId,
                skuId: orderItems.skuId,
                productName: orderItems.productName,
                productImage: orderItems.productImage,
                productCode: products.code,
                color: orderItems.color,
                size: orderItems.size,
                quantity: orderItems.quantity,
                unitPrice: orderItems.unitPrice,
                totalPrice: orderItems.totalPrice,
            })
            .from(orderItems)
            .leftJoin(products, eq(products.id, orderItems.productId))
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

// As tres filas do envio automatico. Retirada na fabrica fica de fora em todas:
// nao tem transportadora, nao tem etiqueta, nao tem rastreio.
const NAO_E_RETIRADA = sql`coalesce(${orders.shippingMethod}, '') !~* 'retir'`;

// 1. Pago e ainda nem foi para o carrinho do Melhor Envio.
export function findPaidOrdersToCart() {
    return db
        .select({ id: orders.id, orderNumber: orders.orderNumber })
        .from(orders)
        .where(and(
            eq(orders.paymentStatus, 'paid'),
            isNull(orders.meOrderId),
            isNull(orders.labelUrl),
            NAO_E_RETIRADA,
        ))
        .orderBy(desc(orders.createdAt))
        .limit(20);
}

// 2. Esta no carrinho e ainda nao tem etiqueta — esperando a Chris pagar.
export function findCartOrdersWithoutLabel() {
    return db
        .select({ id: orders.id, orderNumber: orders.orderNumber, meOrderId: orders.meOrderId })
        .from(orders)
        .where(and(
            isNotNull(orders.meOrderId),
            isNull(orders.labelUrl),
            NAO_E_RETIRADA,
        ))
        .orderBy(desc(orders.createdAt))
        .limit(20);
}

// 3. Tem etiqueta e ainda nao tem rastreio.
export function findLabeledOrdersWithoutTracking() {
    return db
        .select({ id: orders.id, orderNumber: orders.orderNumber, meOrderId: orders.meOrderId })
        .from(orders)
        .where(and(
            isNotNull(orders.labelUrl),
            isNull(orders.trackingCode),
            NAO_E_RETIRADA,
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