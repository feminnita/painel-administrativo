import type { Order, OrderItem, ShippingAddress } from "./types";

type ApiOrder = Record<string, any>;

function mapApiOrderItem(i: Record<string, any>): OrderItem {
  return {
    id: i.id,
    product_name: i.productName ?? "",
    product_image: i.productImage ?? "",
    color: i.color ?? null,
    size: i.size ?? null,
    quantity: i.quantity ?? 0,
    unit_price: Number(i.unitPrice) || 0,
    total_price: Number(i.totalPrice) || 0,
  };
}

export function mapApiOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    order_number: o.orderNumber,
    status: o.status,
    payment_method: o.paymentMethod ?? null,
    payment_status: o.paymentStatus ?? null,
    installments: o.installments ?? null,
    asaas_payment_id: o.asaasPaymentId ?? null,
    subtotal: Number(o.subtotal) || 0,
    shipping_cost: Number(o.shippingCost) || 0,
    discount: Number(o.discount) || 0,
    total: Number(o.total) || 0,
    shipping_method: o.shippingMethod ?? null,
    shipping_address: (o.shippingAddress as ShippingAddress) ?? null,
    tracking_code: o.trackingCode ?? null,
    tracking_url: o.trackingUrl ?? null,
    label_url: o.labelUrl ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt ?? "",
    customer_name: o.customerName ?? "",
    customer_email: o.customerEmail ?? "",
    customer_phone: o.customerPhone ?? "",
    customer_cpf: o.customerCpf ?? null,
    items: Array.isArray(o.items) ? o.items.map(mapApiOrderItem) : [],
  };
}
