import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const siteSettings = pgTable('site_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique(),
    value: jsonb('value').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
