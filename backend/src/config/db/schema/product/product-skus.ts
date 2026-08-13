import { pgTable, uuid, text, integer, numeric, timestamp, unique } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productsColors } from './product-colors';

export const productsSkus = pgTable('products_skus', {

    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id),
    size: text('size').notNull(),
    colorId: uuid('color_id').references(() => productsColors.id),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    price: numeric('price', { precision: 10, scale: 2 }),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    productSizeColorUnique: unique().on(table.productId, table.size, table.colorId)
}));