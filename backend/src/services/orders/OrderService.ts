import * as OrdeRepository from '../../repository/orders/OrderRepository';
import { orderStatusEnum, paymentStatusEnum } from '../../config/db/schema';
import * as EmailService from '../../integrations/resend/service/EmailServices';


export function listOrders() {
    return OrdeRepository.findAllWithRelations();
}

export async function getOrder(id: string) {
    const order = await OrdeRepository.findById(id);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const items = await OrdeRepository.findItemsByOrderId(order.id);

    return {
        ...order,
        items,
    }
}

async function confirmSaleForOrder(orderId: string) {

    try {
        const items = await OrdeRepository.findItemsByOrderId(orderId);
        for (const item of items) {
            if (item.skuId) await OrdeRepository.confirmSkuSale(item.skuId, item.quantity);
        }
    } catch (error) {
        console.error(error)
    }
}

async function releaseReservationForOrder(orderId: string) {

    try {
        const items = await OrdeRepository.findItemsByOrderId(orderId);
        for (const item of items) {
            if (item.skuId) await OrdeRepository.releaseSkuReservation(item.skuId, item.quantity);
        }

        const order = await OrdeRepository.findById(orderId);

    } catch (error) {
        console.error(`Falha ao liberar reserva do pedido ${orderId}:`, error);
    }
}

async function sendPaymentConfirmedEmail(order: {
    id: string;
    orderNumber: string;
    total: string;
    customerId: string | null;
}) {

    if (!order.customerId) return;

    const customer = await OrdeRepository.findCustomerById(order.customerId);

    if (!customer) return;

    await EmailService.sendPaymentConfirmed({
        customerName: customer.name,
        customerEmail: customer.email,
        orderNumber: order.orderNumber,
        total: order.total,
    })
}

async function sendOrderShippedEmail(order: {
    id: string;
    orderNumber: string;
    total: string;
    customerId: string | null;
    trackingCode: string | null;
}) {
    if (!order.customerId) return;

    const customer = await OrdeRepository.findCustomerById(order.customerId);
    if (!customer) return;

    await EmailService.sendOrderShipped({
        customerName: customer.name,
        customerEmail: customer.email,
        orderNumber: order.orderNumber,
        total: order.total,
        trackingCode: order.trackingCode,
    });
}

export async function updateOrderStatus(
    id: string,
    input: {
        status?: string;
        paymentStatus?: string;
    }
) {
    if (input.status && !orderStatusEnum.enumValues.includes(input.status as never)) {
        throw new Error('INVALID_STATUS');
    }

    if (input.paymentStatus && !paymentStatusEnum.enumValues.includes(input.paymentStatus as never)) {
        throw new Error('INVALID_PAYMENT_STATUS');
    }

    if (!input.status && !input.paymentStatus) {
        throw new Error('NOTHING_TO_UPDATE');
    }

    const before = await OrdeRepository.findById(id);
    if (!before) throw new Error('ORDER_NOT_FOUND');

    const wasPaid = before.paymentStatus === 'paid';
    const wasCancelled = before.status === 'cancelled';
    const wasShipped = before.status === 'shipped';

    const order = await OrdeRepository.updateStatus(id, {
        status: input.status as typeof orderStatusEnum.enumValues[number] | undefined,
        paymentStatus: input.paymentStatus as typeof paymentStatusEnum.enumValues[number] | undefined,
    });

    if (order.paymentStatus === 'paid' && !wasPaid) {
        await confirmSaleForOrder(order.id);
        await sendPaymentConfirmedEmail(order);
    } else if (order.status === 'shipped' && !wasShipped) {
        const updated = await OrdeRepository.saveShippedAt(order.id);
        await sendOrderShippedEmail(order);
        return updated;
    } else if (order.status === 'shipped' && !wasCancelled && wasPaid) {
        await releaseReservationForOrder(order.id);
    }

    return order;
}

export async function setManualTracking(orderId: string, trackingCode: string) {
    const code = trackingCode.trim().toUpperCase();
    if (!code) throw new Error('TRACKING_REQUIRED');

    const order = await OrdeRepository.saveTrackingCode(orderId, code);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    return updateOrderStatus(orderId, { status: 'shipped' });
}

const RESERVATION_TTL_MINUTES: Record<string, number> = {
    pix: 60,
    card: 60,
    boleto: 3 * 24 * 60,
};

const DEFAULT_TTL_MINUTES = 60;

export async function expireStaleOrders() {
    const pendingOrders = await OrdeRepository.findUnpaidPendingOrders();
    const now = Date.now();

    for (const order of pendingOrders) {
        const ttlMinutes = RESERVATION_TTL_MINUTES[order.paymentMethod ?? ''] ?? DEFAULT_TTL_MINUTES;
        const ageMinutes = (now - new Date(order.createdAt!).getTime()) / 60000;

        if (ageMinutes > ttlMinutes) {
            const cancelled = await OrdeRepository.cancelIfStillUnpaid(order.id);

            if (cancelled) {
                await releaseReservationForOrder(order.id);
                console.log(`Pedido ${order.orderNumber} expirado - reserva liberada`)
            }
        }
    }
}

