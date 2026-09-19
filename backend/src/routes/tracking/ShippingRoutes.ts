import { Router } from 'express';
import * as ShippingController from '../../controllers/shipping/ShippingController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminShippingRoutes = Router({ mergeParams: true });
adminShippingRoutes.use(requireAdminAuth);

// Dois passos, porque a Chris paga o carrinho no Melhor Envio (PIX), e o
// painel nunca paga nada.
adminShippingRoutes.post('/label', ShippingController.sendToCart);
adminShippingRoutes.post('/label/gerar', ShippingController.generateLabel);
adminShippingRoutes.post('/tracking', ShippingController.refreshTracking);