export type Coupon = {
    id: string;
    code: string;
    type: string;
    value: number;
    min_order_value: number;
    max_uses: number | null;
    used_count: number;
    active: boolean;
    expires_at: string | null;
}

export type CouponInput = Omit<Coupon, "id" | "used_cout">;
