import { Router } from 'express';
import * as ReportController from '../../controllers/reports/ReportController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminReportRoutes = Router();

adminReportRoutes.get('/sales', requireAdminAuth, ReportController.sales);
adminReportRoutes.get('/visitas', requireAdminAuth, ReportController.visits);