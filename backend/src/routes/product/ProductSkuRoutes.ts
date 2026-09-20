import { Router } from 'express';
import * as ProductSkuController from '../../controllers/product/ProductSkuController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

export const adminProductSkuRoutes = Router({ mergeParams: true });
adminProductSkuRoutes.use(requireAdminAuth);

adminProductSkuRoutes.get('/', ProductSkuController.list);

// Antes de '/:id' nao faz diferenca aqui (o :id so existe em PUT e DELETE),
// mas fica junto do list porque e a mesma pergunta: o que este produto tem, e
// o que ele deliberadamente NAO tem.
adminProductSkuRoutes.get('/apagadas', ProductSkuController.apagadas);
adminProductSkuRoutes.post('/', ProductSkuController.create);
adminProductSkuRoutes.put('/:id', ProductSkuController.update);
adminProductSkuRoutes.delete('/:id', ProductSkuController.remove);

// Tira a marca de "apagada" de uma combinacao cor+tamanho.
// Chamado quando a Chris adiciona a variacao DE PROPOSITO — sem isto, apagar
// uma vez bloquearia para sempre, o que seria pior que o problema original.
adminProductSkuRoutes.post('/liberar', ProductSkuController.liberar);
