export type ShippingQuoteOption = {
    id: number;
    name: string;
    company: string;
    price: string;
    deliveryDays: number;
};

export type PackageDimensions = {
    length: number;
    width: number;
    height: number;
    weight: number;
};

export type PackableItem = {
    weightKg: string | null;
    pkgHeightCm: string | null;
    pkgWidthCm: string | null;
    pkgLengthCm: string | null;
    quantity: number;
};

export type RawQuoteOption = {
    id: number;
    name: string;
    price?: string;
    delivery_time?: number;
    company?: { name: string };
    error?: string;
};

export type LabelOrderData = {
    orderNumber: string;
    serviceId: number;
    total: string;
    shippingAddress: {
        cep: string;
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
    };
    customer: {
        name: string;
        email: string;
        cpf: string;
        phone?: string | null
    };
    items: {
        name: string;
        quantity: number;
        unitaryValue: string
    }[];
    package: PackageDimensions;
    /**
     * Chave de acesso da NF-e (44 digitos), quando o pedido ja tem nota
     * autorizada. Com ela o envio vai como comercial e o seguro nao tem teto;
     * sem ela, o Melhor Envio limita o seguro a R$ 1.000.
     */
    invoiceKey?: string | null;
};

