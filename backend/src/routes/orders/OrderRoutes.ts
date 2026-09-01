import { Router } from 'express';
import * as OrderController from '../../controllers/orders/OrderController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminOrderRoutes = Router();
adminOrderRoutes.use(requireAdminAuth);

adminOrderRoutes.get('/', OrderController.list);
adminOrderRoutes.get('/:id', OrderController.getOne);
adminOrderRoutes.put('/:id/tracking', OrderController.setTracking);
adminOrderRoutes.put('/:id/status', OrderController.updateStatus);
