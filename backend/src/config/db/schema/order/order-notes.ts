import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';

// Observacao interna do pedido: cada anotacao guarda AUTOR (admin logado) +
// DATA/HORA. Historico append-only (nunca sobrescreve) para a operadora ver
// quem escreveu o que e quando.
export const orderNotes = pgTable('order_notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    author: text('author').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
