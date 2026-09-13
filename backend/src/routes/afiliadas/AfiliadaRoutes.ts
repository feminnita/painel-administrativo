import { Router } from 'express';
import * as AfiliadaController from '../../controllers/afiliadas/AfiliadaController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

// Tudo protegido: e dinheiro a pagar e dado pessoal de parceira.
export const adminAfiliadaRoutes = Router();

adminAfiliadaRoutes.get('/', requireAdminAuth, AfiliadaController.listar);
adminAfiliadaRoutes.get('/:id', requireAdminAuth, AfiliadaController.detalhe);
adminAfiliadaRoutes.patch('/:id', requireAdminAuth, AfiliadaController.atualizar);
adminAfiliadaRoutes.post('/:id/pagamentos', requireAdminAuth, AfiliadaController.pagar);
