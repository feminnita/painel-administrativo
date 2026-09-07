import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

// Mesma tabela que a loja grava quando alguem se inscreve pelo pop-up. O painel
// so LE: quem entra na lista e quem sai decide isso na loja, nao aqui.
//
// `source` diz por qual porta a pessoa entrou ('popup', 'tray' para os 1.270 que
// vieram da base antiga). `unsubscribedAt` preenchido = pediu para sair; a linha
// FICA, senao a pessoa voltaria a receber no proximo cadastro.
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    source: text('source').notNull().default('popup'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
});
