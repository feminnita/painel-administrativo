import { pgTable, pgEnum, uuid, text, numeric, timestamp, integer, jsonb, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { customers } from '../users/customers';
import { coupons } from './coupons';

export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled',]);

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'overdue', 'refunded', 'disputed',]);

export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    customerId: uuid('customer_id').references(() => customers.id),
    status: orderStatusEnum('status').notNull().default('pending'),
    paymentMethod: text('payment_method'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).default('0'),
    discount: numeric('discount', { precision: 10, scale: 2 }).default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    shippingAddress: jsonb('shipping_address').$type<Record<string, unknown>>(),
    notes: text('notes'),
    couponId: uuid('coupon_id').references(() => coupons.id),
    couponCode: text('coupon_code'),
    asaasPaymentId: text('asaas_payment_id'),
    affiliateCode: text('affiliate_code'),
    meOrderId: text('me_order_id'),
    labelUrl: text('label_url'),
    labelGeneratedAt: timestamp('label_generated_at', { withTimezone: true }),
    trackingCode: text('tracking_code'),
    trackingUrl: text('tracking_url'),
    shippingServiceId: integer('shipping_service_id'),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    refCreator: text('ref_creator'),
    blingOrderId: bigint('bling_order_id', { mode: 'number' }),
    installments: integer('installments'),
    shippingMethod: text('shipping_method'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    customerCouponUnique: uniqueIndex('orders_customer_coupon_unique')
        .on(table.customerId, table.couponId),
}));