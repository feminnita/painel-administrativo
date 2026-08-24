import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const blingTokens = pgTable('bling_tokens', {
    id: uuid('id').primaryKey(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    scope: text('scope'),
    updateAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const blingSyncLog = pgTable('bling_sync_log', {
    id: uuid('id').defaultRandom().primaryKey(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    productsSynced: integer('products_synced').notNull().default(0),
    productsCreated: integer('products_created').notNull().default(0),
    productsUpdated: integer('products_updated').notNull().default(0),
    errors: integer('errors').notNull().default(0),
    status: text('status').notNull().default('running'),
});