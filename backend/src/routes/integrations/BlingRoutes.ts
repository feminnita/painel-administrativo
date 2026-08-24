import { Router } from 'express';
import * as BlingController from '../../controllers/integrations/BlingController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminBlingRoutes = Router();

adminBlingRoutes.get('/oauth/start', BlingController.oauthStart);
adminBlingRoutes.get('/oauth/callback', BlingController.oauthCallback);
adminBlingRoutes.get('/status', requireAdminAuth, BlingController.status);
adminBlingRoutes.post('/sync/step', requireAdminAuth, BlingController.syncStep);
adminBlingRoutes.get('/sync/logs', requireAdminAuth, BlingController.syncLogs);
adminBlingRoutes.post('/push-order/:prderId', requireAdminAuth, BlingController.pushOrder)