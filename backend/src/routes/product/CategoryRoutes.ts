import { Router } from 'express';
import * as categoryController from '../../controllers/product/CategoryController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCategoryRoutes = Router();
adminCategoryRoutes.use(requireAdminAuth);

adminCategoryRoutes.get('/', categoryController.list);
adminCategoryRoutes.get('/:id', categoryController.getOne);
adminCategoryRoutes.get('/product-counts', categoryController.productCounts);
adminCategoryRoutes.post('/', categoryController.create);
adminCategoryRoutes.put('/', categoryController.update);
adminCategoryRoutes.put('/reorder', categoryController.reorder);
adminCategoryRoutes.delete('/:id', categoryController.deactive); // desativa
adminCategoryRoutes.delete('/:id', categoryController.deleteCategory); // deleta