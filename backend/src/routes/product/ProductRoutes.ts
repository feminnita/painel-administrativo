import { Router } from 'express';
import * as ProductController from '../../controllers/product/ProductController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminProductRoutes = Router();
adminProductRoutes.use(requireAdminAuth);

adminProductRoutes.get('/', ProductController.list);
adminProductRoutes.post('/full', ProductController.saveFull);
adminProductRoutes.post('/bulk', ProductController.bulk);
adminProductRoutes.get('/:id', ProductController.getOne);
adminProductRoutes.put('/:id/full', ProductController.saveFull);
adminProductRoutes.get('/:id/color-images', ProductController.colorImages);
adminProductRoutes.patch('/:id/active', ProductController.setActive);
adminProductRoutes.patch('/:id/visible', ProductController.setVisible);
adminProductRoutes.delete('/:id', ProductController.remove);
