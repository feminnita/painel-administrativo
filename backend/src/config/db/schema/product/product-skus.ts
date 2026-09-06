import { pgTable, uuid, text, integer, numeric, timestamp, unique, bigint, boolean, date } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productsColors } from './product-colors';

export const productsSkus = pgTable('products_skus', {

    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull().references(() => products.id),
    size: text('size').notNull(),
    colorId: uuid('color_id').references(() => productsColors.id),
    blingId: bigint('bling_id', { mode: 'number' }),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    price: numeric('price', { precision: 10, scale: 2 }),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
    reference: text('reference'),
    ean: text('ean'),
    costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
    minStock: integer('min_stock').default(0),
    saleStart: date('sale_start'),
    saleEnd: date('sale_end'),
    active: boolean('active').default(true),
    availability: text('availability'),
    outOfStockAction: text('out_of_stock_action'),
    weightG: integer('weight_g'),
    heightCm: numeric('height_cm', { precision: 6, scale: 2 }),
    widthCm: numeric('width_cm', { precision: 6, scale: 2 }),
    lengthCm: numeric('length_cm', { precision: 6, scale: 2 }),
    position: integer('position'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    productSizeColorUnique: unique().on(table.productId, table.size, table.colorId)
}));
