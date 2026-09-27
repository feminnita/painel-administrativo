import { Router } from 'express';
import * as ReconcileController from '../../controllers/reconcile/ReconcileController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminReconcileRoutes = Router();
adminReconcileRoutes.use(requireAdminAuth);

adminReconcileRoutes.post('/dry-run', ReconcileController.dryRun);
adminReconcileRoutes.post('/apply', ReconcileController.apply);
adminReconcileRoutes.post('/refresh-backup', ReconcileController.refreshBackup);

// Passada pelo CÓDIGO da variação, contra o Bling ao vivo. Resolve o que o
// snapshot não alcança: vínculo que nunca existiu.
adminReconcileRoutes.post('/codigo/dry-run', ReconcileController.dryRunPorCodigo);
adminReconcileRoutes.post('/codigo/apply', ReconcileController.applyPorCodigo);
