import { Router, Request, Response } from 'express';
import * as AcompanhamentoPostagem from '../../services/shipping/AcompanhamentoPostagem';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

// Tela "Postagens": pedidos pagos ainda nao entregues e se o pacote ja foi bipado.
export const adminPostagensRoutes = Router();
adminPostagensRoutes.use(requireAdminAuth);

adminPostagensRoutes.get('/', async (req: Request, res: Response) => {
    try {
        res.json(await AcompanhamentoPostagem.listar(req.query.atualizar === '1'));
    } catch (error) {
        console.error('Erro ao montar o acompanhamento de postagem:', error);
        res.status(502).json({ error: 'Não consegui consultar as postagens agora' });
    }
});
