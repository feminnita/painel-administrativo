import type { Coupon } from "./types";

export function mapApiCoupon(c: Record<string, any>): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type === "percent" ? "percentage" : "fixed",
    value: Number(c.value) || 0,
    min_order_value: Number(c.minOrderValue) || 0,
    max_uses: c.maxUses ?? null,
    used_count: c.usedCount ?? 0,
    active: c.active ?? true,
    expires_at: c.expiresAt ?? null,
  };
}

export function toApiCoupon(input: {
  code: string;
  type: string;
  value: number;
  min_order_value: number;
  max_uses: number | null;
  active: boolean;
  expires_at: string | null;
}) {
  return {
    code: input.code,
    type: input.type === "percentage" ? "percent" : "fixed",
    value: input.value,
    minOrderValue: input.min_order_value,
    maxUses: input.max_uses,
    active: input.active,
    expiresAt: input.expires_at,
  };
}
