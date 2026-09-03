import { Router } from 'express';
import * as OrderController from '../../controllers/orders/OrderController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminOrderRoutes = Router();
adminOrderRoutes.use(requireAdminAuth);

adminOrderRoutes.get('/', OrderController.list);
// Impressao em lote: carimbo de ja-impresso (rotas estaticas antes de '/:id').
adminOrderRoutes.post('/print/mark', OrderController.markPrinted);
adminOrderRoutes.post('/print/clear', OrderController.clearPrinted);
adminOrderRoutes.get('/:id', OrderController.getOne);
adminOrderRoutes.get('/:id/history', OrderController.getHistory);
adminOrderRoutes.get('/:id/notes', OrderController.listNotes);
adminOrderRoutes.post('/:id/notes', OrderController.createNote);
adminOrderRoutes.put('/:id/tracking', OrderController.setTracking);
adminOrderRoutes.put('/:id/status', OrderController.updateStatus);
adminOrderRoutes.put('/:id/status-override', OrderController.setStatusOverride);
