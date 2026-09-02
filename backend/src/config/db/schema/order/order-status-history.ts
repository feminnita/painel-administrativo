import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';

// Auditoria de mudancas de status do pedido.
// `source` = nome da integracao que provocou a mudanca (asaas / bling / melhor-envio)
// ou 'admin' quando foi uma sobrescrita (override) manual feita no painel.
export const orderStatusHistory = pgTable('order_status_history', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    source: text('source').notNull().default('admin'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
