import { pgTable, uuid, text, integer, numeric } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { products } from '../product/products';
import { productsSkus } from '../product/product-skus';

export const orderItems = pgTable('order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    productId: uuid('product_id').references(() => products.id),
    skuId: uuid('sku_id').references(() => productsSkus.id),
    productName: text('product_name').notNull(),
    productImage: text('product_image'),
    color: text('color'),
    size: text('size'),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});