import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { coupons } from '../../config/db/schema';

type CouponInsert = typeof coupons.$inferInsert;

export function findAll() {
    return db.query.coupons.findMany();
}

export function findById(id: string) {
    return db.query.coupons.findFirst({
        where: eq(coupons.id, id)
    });
}

export async function insert(values: CouponInsert) {
    const [coupon] = await db.insert(coupons).values(values).returning();
    return coupon;
}

export async function update(id: string, values: Partial<CouponInsert>) {
    const [coupon] = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning();
    return coupon;
}

export async function deactivate(id: string) {
    const [coupon] = await db.update(coupons).set({ active: false }).where(eq(coupons.id, id)).returning();
    return coupon;
}

export async function deleteCoupon(id: string) {
    const [coupon] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    return coupon;
}