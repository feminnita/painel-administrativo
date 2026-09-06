import * as OrdeRepository from '../../repository/orders/OrderRepository';
import * as MelhorEnvio from '../../integrations/melhorEnvio/service/MelhorEnvio';
import { combinePackage } from '../../integrations/melhorEnvio/domain/MelhorEnvioDomain';

export async function buyLabel(orderId: string) {

    const order = await OrdeRepository.findById(orderId);

    if (!order) throw new Error('ORDER_NOT_FOUND');
    // Retirada na fábrica: não tem transportadora, então nunca gera etiqueta.
    // (mesma convenção /retir/i usada no push do Bling.)
    if (/retir/i.test(String(order.shippingMethod ?? ''))) throw new Error('ORDER_IS_PICKUP');
    if (order.paymentStatus !== 'paid') throw new Error('ORDER_NOT_PAID');
    if (order.labelUrl) throw new Error('LABEL_ALREADY_EXISTS');
    if (!order.customerId || !order.shippingServiceId) throw new Error('ORDER_MISSING_SHIPPING_DATA');

    const customer = await OrdeRepository.findCustomerForShipping(order.customerId);

    if (!customer?.cpf) throw new Error('CUSTOMER_MISSING_CPF');
    const orderItems = await OrdeRepository.findItemsByOrderId(orderId)
    const packableItems = await OrdeRepository.findItemsWithProducts(orderId);
    const pkg = combinePackage(packableItems);

    const label = await MelhorEnvio.buyLabelForOrder({
        orderNumber: order.orderNumber,
        serviceId: order.shippingServiceId,
        total: order.total,
        shippingAddress: order.shippingAddress as never,
        customer: { ...customer, cpf: customer.cpf },
        package: pkg,
        items: orderItems.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            unitaryValue: item.unitPrice,
        }))
    });
    return OrdeRepository.saveLabelInfo(orderId, label);
}

export async function refreshTracking(orderId: string) {
    const order = await OrdeRepository.findById(orderId);

    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (!order.meOrderId) throw new Error('ORDER_HAS_NO_SHIPMENT');

    const trackingCode = await MelhorEnvio.getTrackingCode(order.meOrderId);

    if (trackingCode && trackingCode !== order.trackingCode) {
        return OrdeRepository.saveTrackingCode(orderId, trackingCode);
    }
    return order;
}

