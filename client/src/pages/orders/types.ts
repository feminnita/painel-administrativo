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
    bling_order_id: number | null;
    notes: string | null;
    created_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_cpf: string | null;
    items: OrderItem[];
};

export type OrderFilters = {
    search: string;
    status: string;
};

export type PaymentStatus =
    | "pending" | "paid" | "failed" | "overdue" | "refunded" | "disputed";

export type FulfillmentStatus =
    | "not_shipped" | "processing" | "shipped" | "delivered";
