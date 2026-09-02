import { Router } from 'express';
import * as MelhorEnvioController from '../../controllers/integrations/MelhorEnvioController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const melhorEnvioRoutes = Router();

melhorEnvioRoutes.get('/oauth/start', MelhorEnvioController.oauthStart);
melhorEnvioRoutes.get('/oauth/callback', MelhorEnvioController.oauthCallback);
melhorEnvioRoutes.get('/status', requireAdminAuth, MelhorEnvioController.status);
