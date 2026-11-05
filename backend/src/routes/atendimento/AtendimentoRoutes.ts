import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AtendimentoController from '../../controllers/atendimento/AtendimentoController';
import * as ConversasController from '../../controllers/atendimento/ConversasController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

// Entrada do sistema de marketing (Lia): protegida por segredo compartilhado.
export const atendimentoWebhookRoutes = Router();
atendimentoWebhookRoutes.post(
    '/casos',
    rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }),
    AtendimentoController.receberCaso,
);
atendimentoWebhookRoutes.post(
    '/pedidos',
    rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }),
    AtendimentoController.pedidosDaCliente,
);

// Tela "Atendimento" do painel: fila e "Atendido".
export const adminAtendimentoRoutes = Router();
adminAtendimentoRoutes.use(requireAdminAuth);
adminAtendimentoRoutes.get('/casos', AtendimentoController.listar);
adminAtendimentoRoutes.patch('/casos/:id/atendido', AtendimentoController.atendido);

// Tela "Conversas": caixa de entrada do WhatsApp. O painel so repassa para o
// sistema de marketing, com o segredo guardado aqui no servidor.
adminAtendimentoRoutes.get('/conversas', ConversasController.listarConversas);
adminAtendimentoRoutes.get('/conversas/:telefone/mensagens', ConversasController.mensagens);
adminAtendimentoRoutes.post('/conversas/:telefone/lida', ConversasController.marcarLida);
adminAtendimentoRoutes.post('/conversas/:telefone/devolver', ConversasController.devolver);
adminAtendimentoRoutes.get('/midia/:midiaId', ConversasController.midia);
// A foto vai em base64 dentro do JSON: o limite geral de 25 MB (server.ts) ja
// comporta; o teto de 8 MB da foto e conferido no controller.
adminAtendimentoRoutes.post('/enviar', ConversasController.enviar);
adminAtendimentoRoutes.get('/cliente/:telefone', ConversasController.cliente);
