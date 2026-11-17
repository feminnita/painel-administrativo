import { Router } from 'express';
import * as UsersController from '../../controllers/auth/UsersController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

// Tela "Usuarios": quem tem login no painel.
export const adminUsersRoutes = Router();
adminUsersRoutes.use(requireAdminAuth);
adminUsersRoutes.get('/', UsersController.list);
adminUsersRoutes.post('/', UsersController.create);
adminUsersRoutes.patch('/:id', UsersController.rename);
adminUsersRoutes.delete('/:id', UsersController.remove);
