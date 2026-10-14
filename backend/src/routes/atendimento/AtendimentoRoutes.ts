import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AtendimentoController from '../../controllers/atendimento/AtendimentoController';
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
