import { Router } from 'express';
import * as categoryController from '../../controllers/product/CategoryController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCategoryRoutes = Router();
adminCategoryRoutes.use(requireAdminAuth);

adminCategoryRoutes.get('/', categoryController.list);
adminCategoryRoutes.get('/product-counts', categoryController.productCounts);
adminCategoryRoutes.get('/:id', categoryController.getOne);
adminCategoryRoutes.post('/', categoryController.create);
adminCategoryRoutes.put('/reorder', categoryController.reorder);
adminCategoryRoutes.put('/:id', categoryController.update); // desativa
adminCategoryRoutes.delete('/:id', categoryController.deleteCategory); // deleta