import { Router } from 'express';
import * as ProductSkuController from '../../controllers/product/ProductSkuController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminProductSkuRoutes = Router({ mergeParams: true });
adminProductSkuRoutes.use(requireAdminAuth);

adminProductSkuRoutes.get('/', ProductSkuController.list);
adminProductSkuRoutes.post('/', ProductSkuController.create);
adminProductSkuRoutes.put('/:id', ProductSkuController.update);
adminProductSkuRoutes.delete('/:id', ProductSkuController.remove);

// Tira a marca de "apagada" de uma combinacao cor+tamanho.
// Chamado quando a Chris adiciona a variacao DE PROPOSITO — sem isto, apagar
// uma vez bloquearia para sempre, o que seria pior que o problema original.
adminProductSkuRoutes.post('/liberar', ProductSkuController.liberar);
