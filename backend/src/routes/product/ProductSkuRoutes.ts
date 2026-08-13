import { Router } from 'express';
import * as ProductSkuController from '../../controllers/product/ProductSkuController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminProductSkuRoutes = Router({ mergeParams: true });
adminProductSkuRoutes.use(requireAdminAuth);

adminProductSkuRoutes.get('/', ProductSkuController.list);
adminProductSkuRoutes.post('/', ProductSkuController.create);
adminProductSkuRoutes.put('/:id', ProductSkuController.update);
adminProductSkuRoutes.delete('/:id', ProductSkuController.remove);