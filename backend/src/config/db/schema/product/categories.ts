import { pgTable, uuid, serial, text, boolean, integer, timestamp, AnyPgColumn } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    active: boolean('active').default(true),
    orderIndex: integer('order_index').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
