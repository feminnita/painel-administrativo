import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin';

export const adminPasswordResetTokens = pgTable('admin_password_reset_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id').notNull().references(() => adminUsers.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
