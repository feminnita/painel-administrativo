export type OrderItem = {
    id: string;
    // Vem do produto, por junção — a linha do pedido guarda o nome, não o
    // código. É por ele que se separa a peça na prateleira.
    product_code?: string | null;
    /** Referencia da VARIACAO (27500PRGG) — e o que se procura na prateleira. */
    sku_reference?: string | null;
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
    // A API devolve as colunas do banco; dependendo da rota vem em snake_case ou
    // camelCase. Os dois declarados para a tela nao quebrar de um jeito nem do
    // outro — foi assim que o deploy do painel falhou uma vez.
    me_order_id?: string | null;
    meOrderId?: string | null;
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
