export type AdminCustomer = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cpf: string | null;
    createdAt: string;
    paidOrders: number;
    totalSpent: number;
    lastOrderAt: string | null;
};

export type CustomerOrder = {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    total: number;
    createdAt: string;
    items: number;
};

export type CustomerDetail = {
    customer: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        cpf: string | null;
        birthDate: string | null;
        createdAt: string;
    };

    orders: CustomerOrder[];
};