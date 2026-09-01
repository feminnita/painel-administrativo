import { Router } from 'express';
import * as CartController from '../../controllers/carts/CartController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCartRoutes = Router();

adminCartRoutes.get('/', requireAdminAuth, CartController.listAbandoned);