import { pgTable, uuid, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productsColors } from './product-colors';

export const productColorImages = pgTable('product_color_images', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id),
    colorId: uuid('color_id').references(() => productsColors.id),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    productColorUnique: unique().on(table.productId, table.colorId),
}));