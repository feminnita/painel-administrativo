import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { customers } from './customers';

export type CartItem = {
    productId: string;
    name: string;
    size: string;
    color?: string;
    quantity: number;
};

export const carts = pgTable('carts', {
    customerId: uuid('customer_id').primaryKey().references(() => customers.id),
    items: jsonb('items').$type<CartItem[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
