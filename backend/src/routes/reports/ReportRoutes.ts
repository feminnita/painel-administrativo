import { Router } from 'express';
import * as ReportController from '../../controllers/reports/ReportController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminReportRoutes = Router();

adminReportRoutes.get('/sales', requireAdminAuth, ReportController.sales);
// A tela de Visitas sempre chamou /visits (client/src/pages/visitas/useVisitasAdmin.ts).
// Aqui estava registrado /visitas: 404 em toda carga, e a pagina so mostrava
// "Erro ao carregar o relatorio de visitas". Confirmado no servidor no ar.
adminReportRoutes.get('/visits', requireAdminAuth, ReportController.visits);
adminReportRoutes.get('/buscas', requireAdminAuth, ReportController.searches);