export type StockProduct = {
    id: string;
    name: string;
    category: string;
};

export type StockSku = {
    id: string;
    size: string;
    color: string | null;
    stock_qty: number;
    reserved_qty: number;
};
