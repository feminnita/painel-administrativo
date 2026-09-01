export type AbandonedCartItem = {
    productId: string;
    name: string;
    size: string;
    color: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    image: string | null;
};

export type AbandonedCart = {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    updatedAt: string;
    items: AbandonedCartItem[];
    total: number;
};