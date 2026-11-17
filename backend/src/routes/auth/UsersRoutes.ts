import { Router } from 'express';
import * as UsersController from '../../controllers/auth/UsersController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';
import { ehAdmin } from '../../services/atendimento/Permissoes';

// Tela "Usuarios": quem tem login no painel.
export const adminUsersRoutes = Router();
adminUsersRoutes.use(requireAdminAuth);
// So a administradora mexe em logins: um atendente nao pode criar usuario nem se dar acesso total.
adminUsersRoutes.use((req, res, next) => {
    if (!ehAdmin(req.admin)) return res.status(403).json({ error: 'Só a administradora acessa os usuários.' });
    next();
});
adminUsersRoutes.get('/', UsersController.list);
adminUsersRoutes.post('/', UsersController.create);
adminUsersRoutes.patch('/:id', UsersController.rename);
adminUsersRoutes.delete('/:id', UsersController.remove);
