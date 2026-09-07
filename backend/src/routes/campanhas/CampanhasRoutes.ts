import { Router } from 'express';
import * as CampanhasController from '../../controllers/campanhas/CampanhasController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCampanhasRoutes = Router();
adminCampanhasRoutes.get('/', requireAdminAuth, CampanhasController.overview);
