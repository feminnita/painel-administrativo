import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

// Caso aberto quando a Lia (WhatsApp oficial) passa a cliente para uma pessoa.
// A equipe responde pelo WhatsApp do celular e marca "Atendido" aqui:
// `atendidoEm` preenchido = saiu da fila, e a Lia volta a poder falar com a cliente.
// Tabela so do painel: o DDL fica em scripts/cria_tabelas_do_painel.mjs (IF NOT EXISTS).
export const atendimentoCasos = pgTable('atendimento_casos', {
    id: uuid('id').defaultRandom().primaryKey(),
    telefone: text('telefone').notNull(),
    nome: text('nome'),
    resumo: text('resumo').notNull(),
    ultimaMensagem: text('ultima_mensagem'),
    origem: text('origem').notNull().default('whatsapp-oficial'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
    atendidoEm: timestamp('atendido_em', { withTimezone: true }),
    atendidoPor: text('atendido_por'),
});
