import { Router } from 'express';
import * as ProductColorController from '../../controllers/product/ProductColorController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminProductColorRoutes = Router();
adminProductColorRoutes.use(requireAdminAuth);

adminProductColorRoutes.get('/', ProductColorController.list);
adminProductColorRoutes.get('/:id', ProductColorController.getOne);
adminProductColorRoutes.post('/', ProductColorController.create);
adminProductColorRoutes.put('/:id', ProductColorController.update);
adminProductColorRoutes.delete('/:id', ProductColorController.remove);