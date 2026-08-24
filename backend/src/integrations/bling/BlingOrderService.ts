import * as OrderRepository from '../../repository/orders/OrderRepository';
import * as BlingApi from './BlingApi';
import * as BlingDomain from './BlingDomain';
import * as TokenService from './TokenService';

export async function pushOrder(orderId: string): Promise<{ blingOrderId: number }> {
    const token = await TokenService.getAccessToken();
    if (!token) throw new Error('BLING_NOT_CONNECTED');

    const order = await OrderRepository.findById(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    if (order.blingOrderId) {
        throw new Error(`ALREADY_PUSHED:${order.blingOrderId}`);
    }

    const [items, customer] = await Promise.all([
        OrderRepository.findItemsForBling(orderId),
        order.customerId
            ? OrderRepository.findCustomerForShipping(order.customerId)
            : Promise.resolve(null),
    ]);

    if (!items.length) throw new Error('ORDER_WITHOUT_ITEMS');

    const payload = BlingDomain.buildSalesOrderPayload(
        { order, items, customer: customer ?? null },
        new Date(),
    );

    const result = await BlingApi.postSalesOrder(token, payload);
    const blingOrderId = result?.data?.id;

    if (!blingOrderId) throw new Error('BLING_NO_ORDER_ID');

    await OrderRepository.saveBlingOrderId(orderId, blingOrderId);

    return { blingOrderId };
}
