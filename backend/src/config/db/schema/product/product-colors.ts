import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const productsColors = pgTable('products_colors', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    imageUrl: text('image_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})



