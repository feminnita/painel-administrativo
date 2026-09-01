export type SalesDay = {
    day: string;
    revenue: number;
    orders: number;
};

export type SalesTopProduct = {
    name: string;
    quantity: number;
    revenue: number;
};

export type SalesPaymentMethod = {
    method: string;
    orders: number;
    revenue: number;
};

export type SalesReport = {
    days: number;
    revenue: number;
    orders: number;
    discounts: number;
    shipping: number;
    itemsSold: number;
    avgTicket: number;
    byDay: SalesDay[];
    topProducts: SalesTopProduct[];
    byPaymentMethod: SalesPaymentMethod[];
};
