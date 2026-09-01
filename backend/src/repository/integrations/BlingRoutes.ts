import { Router } from 'express';
import * as BlingController from '../../controllers/integrations/BlingController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminBlingRoutes = Router();

adminBlingRoutes.get('/oauth/start', BlingController.oauthStart);
adminBlingRoutes.get('/oauth/callback', BlingController.oauthCallback);
adminBlingRoutes.get('/status', requireAdminAuth, BlingController.status);