export type OrderItem = {
    id: string;
    product_name: string;
    product_image: string;
    color: string | null;
    size: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
};

export type ShippingAddress = {
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
};

export type Order = {
    id: string;
    order_number: string;
    status: string;
    status_override: OverrideValue | null;
    payment_method: string | null;
    payment_status: string | null;
    installments: number | null;
    asaas_payment_id: string | null;
    subtotal: number;
    shipping_cost: number;
    discount: number;
    total: number;
    shipping_method: string | null;
    shipping_address: ShippingAddress | null;
    tracking_code: string | null;
    tracking_url: string | null;
    label_url: string | null;
    label_generated_at: string | null;
    me_order_id: string | null;
    shipped_at: string | null;
    bling_order_id: number | null;
    bling_push_status: string | null;
    coupon_code: string | null;
    nfe_id: string | null;
    nfe_number: string | null;
    nfe_key: string | null;
    nfe_status: string | null;
    nfe_xml_url: string | null;
    nfe_pdf_url: string | null;
    notes: string | null;
    created_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_cpf: string | null;
    items: OrderItem[];
};

export type StatusHistoryEntry = {
    id: string;
    from_status: string | null;
    to_status: string;
    source: string;
    created_at: string;
};

export type OrderDetail = Order & {
    status_history: StatusHistoryEntry[];
};

export type OrderFilters = {
    search: string;
    status: string;
};

export type PaymentStatus =
    | "pending" | "paid" | "failed" | "overdue" | "refunded" | "disputed";

export type FulfillmentStatus =
    | "not_shipped" | "processing" | "shipped" | "delivered";

// Status DERIVADO (nunca manual) - calculado dos campos do pedido.
export type DerivedStatus =
    | "aguardando_pagamento" | "pago" | "enviado_bling" | "nota_emitida"
    | "etiqueta_gerada" | "postado" | "entregue" | "cancelado";

// Sobrescrita manual (override) - excecao operacional.
export type OverrideValue = "em_separacao" | "aguardando_estoque" | "cancelado";
