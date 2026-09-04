import { Router } from 'express';
import * as ReconcileController from '../../controllers/reconcile/ReconcileController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminReconcileRoutes = Router();
adminReconcileRoutes.use(requireAdminAuth);

adminReconcileRoutes.post('/dry-run', ReconcileController.dryRun);
adminReconcileRoutes.post('/apply', ReconcileController.apply);
adminReconcileRoutes.post('/refresh-backup', ReconcileController.refreshBackup);
