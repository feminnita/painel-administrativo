import * as CouponRepository from '../../repository/orders/CouponRepository';

export function listCoupons() {
    return CouponRepository.findAll();
}

export async function getCoupon(id: string) {
    const coupon = await CouponRepository.findById(id);

    if (!coupon) throw new Error('COUPON_NOT_FOUND');
    return coupon;
}

export function createCoupon(input: {
    code: string;
    type: 'percent' | 'fixed';
    value: string;
    minOrderValue?: string;
    maxUses?: number;
    expiresAt?: string;
}) {
    return CouponRepository.insert({
        ...input,
        code: input.code.toUpperCase().trim(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
}

export async function updateCoupon(id: string, input: Record<string, unknown>) {
    const coupon = await CouponRepository.update(id, input);

    if (!coupon) throw new Error('COUPON_NOT_FOUND');
    return coupon;
}

export async function deactivateCoupon(id: string) {
    const coupon = await CouponRepository.deactivate(id);

    if (!coupon) throw new Error('COUPON_NOT_FOUND');
    return coupon;
}

export async function deleteCoupon(id: string) {
    const coupon = await CouponRepository.remove(id);
    if (!coupon) throw new Error('COUPON_NOT_FOUND');
}