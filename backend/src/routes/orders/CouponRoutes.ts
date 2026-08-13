import { Router } from 'express';
import * as CouponController from '../../controllers/orders/CouponController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminCouponRoutes = Router();
adminCouponRoutes.use(requireAdminAuth);

adminCouponRoutes.get('/', CouponController.list);
adminCouponRoutes.get('/:id', CouponController.getOne);
adminCouponRoutes.post('/', CouponController.create);
adminCouponRoutes.put('/:id', CouponController.update);
adminCouponRoutes.delete('/:id', CouponController.deleteCoupon);


