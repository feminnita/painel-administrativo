import { pgTable, pgEnum, uuid, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const couponTypeEnum = pgEnum('coupon_type', ['percent', 'fixed']);

export const coupons = pgTable('coupons', {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    type: couponTypeEnum('type').notNull(),
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    minOrderValue: numeric('min_order_value', { precision: 10, scale: 2 }),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    active: boolean('active').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});