import type {
  Order,
  OrderDetail,
  OrderItem,
  OrderNote,
  OverrideValue,
  ShippingAddress,
  StatusHistoryEntry,
} from "./types";

type ApiOrder = Record<string, any>;

function mapApiOrderItem(i: Record<string, any>): OrderItem {
  return {
    id: i.id,
    product_name: i.productName ?? "",
    product_image: i.productImage ?? "",
    product_code: i.productCode ?? null,
    brand: i.brand ?? null,
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
    status_override: (o.statusOverride as OverrideValue) ?? null,
    payment_method: o.paymentMethod ?? null,
    payment_status: o.paymentStatus ?? null,
    installments: o.installments ?? null,
    asaas_payment_id: o.asaasPaymentId ?? null,
    printed_at: o.printedAt ?? null,
    printed_by: o.printedBy ?? null,
    subtotal: Number(o.subtotal) || 0,
    shipping_cost: Number(o.shippingCost) || 0,
    discount: Number(o.discount) || 0,
    total: Number(o.total) || 0,
    shipping_method: o.shippingMethod ?? null,
    shipping_address: (o.shippingAddress as ShippingAddress) ?? null,
    tracking_code: o.trackingCode ?? null,
    tracking_url: o.trackingUrl ?? null,
    label_url: o.labelUrl ?? null,
    label_generated_at: o.labelGeneratedAt ?? null,
    me_order_id: o.meOrderId ?? null,
    shipped_at: o.shippedAt ?? null,
    bling_order_id: o.blingOrderId ?? null,
    bling_push_status: o.blingPushStatus ?? null,
    coupon_code: o.couponCode ?? null,
    nfe_id: o.nfeId ?? null,
    nfe_number: o.nfeNumber ?? null,
    nfe_key: o.nfeKey ?? null,
    nfe_status: o.nfeStatus ?? null,
    nfe_xml_url: o.nfeXmlUrl ?? null,
    nfe_pdf_url: o.nfePdfUrl ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt ?? "",
    customer_name: o.customerName ?? "",
    customer_email: o.customerEmail ?? "",
    customer_phone: o.customerPhone ?? "",
    customer_cpf: o.customerCpf ?? null,
    items: Array.isArray(o.items) ? o.items.map(mapApiOrderItem) : [],
  };
}

function mapStatusHistoryEntry(h: Record<string, any>): StatusHistoryEntry {
  return {
    id: h.id,
    from_status: h.fromStatus ?? null,
    to_status: h.toStatus ?? "",
    source: h.source ?? "admin",
    created_at: h.createdAt ?? "",
  };
}

function mapOrderNote(n: Record<string, any>): OrderNote {
  return {
    id: n.id,
    author: n.author ?? "",
    body: n.body ?? "",
    created_at: n.createdAt ?? "",
  };
}

export function mapApiOrderDetail(o: ApiOrder): OrderDetail {
  return {
    ...mapApiOrder(o),
    status_history: Array.isArray(o.statusHistory)
      ? o.statusHistory.map(mapStatusHistoryEntry)
      : [],
    order_notes: Array.isArray(o.notes) ? o.notes.map(mapOrderNote) : [],
  };
}
