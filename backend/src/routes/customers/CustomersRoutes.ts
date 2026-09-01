import { Router } from 'express';
import * as CustomerController from '../../controllers/customers/CustomerController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCustomerRoutes = Router();

adminCustomerRoutes.get('/', requireAdminAuth, CustomerController.list);
adminCustomerRoutes.get('/:id', requireAdminAuth, CustomerController.detail);