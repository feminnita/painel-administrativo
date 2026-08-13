import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').default('admin'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const adminSessions = pgTable('admin_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    adminId: uuid('admin_id').notNull().references(() => adminUsers.id),
    userAgent: text('user_agent').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

})