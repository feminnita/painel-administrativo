import { Router } from 'express';
import * as AuthController from '../../controllers/auth/AuthController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminAuthRoutes = Router();

adminAuthRoutes.post('/login', AuthController.login);
adminAuthRoutes.post('/logout', AuthController.logout);
adminAuthRoutes.get('/me', requireAdminAuth, AuthController.me);