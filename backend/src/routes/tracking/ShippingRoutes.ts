import { Router } from 'express';
import * as ShippingController from '../../controllers/shipping/ShippingController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminShippingRoutes = Router({ mergeParams: true });
adminShippingRoutes.use(requireAdminAuth);

adminShippingRoutes.post('/label', ShippingController.buyLabel);
adminShippingRoutes.post('/tracking', ShippingController.refreshTracking);