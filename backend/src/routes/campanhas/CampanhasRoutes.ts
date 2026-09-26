import { Router } from 'express';
import * as CampanhasController from '../../controllers/campanhas/CampanhasController';
import * as MetaController from '../../controllers/campanhas/MetaController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCampanhasRoutes = Router();
adminCampanhasRoutes.get('/', requireAdminAuth, CampanhasController.overview);
// Rota separada de proposito: a Meta fora do ar nao pode deixar a pagina em branco.
adminCampanhasRoutes.get('/meta', requireAdminAuth, MetaController.desempenho);
