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

// Últimos N dias ou um intervalo de datas (YYYY-MM-DD, "to" incluso).
export type SalesPeriod = { days: number } | { from: string; to: string };

export type SalesReport = {
    days: number;
    from: string | null;
    to: string | null;
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
