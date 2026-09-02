import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const meTokens = pgTable('me_tokens', {
    id: text('id').primaryKey(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    scope: text('scope'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
