import { Request, Response } from 'express';
import * as ProductSkuService from '../../services/product/ProductSkuService';
import * as Apagadas from '../../repository/product/VariacoesApagadasRepository';

export async function list(req: Request, res: Response) {
    const productId = req.params.productId as string;
    res.json(await ProductSkuService.listSkusByProduct(productId));
}

export async function create(req: Request, res: Response) {
    try {
        const productId = req.params.productId as string;
        const { size, colorId, stockQty, price, salePrice } = req.body;
        res.status(201).json(await ProductSkuService.createSku({ productId, size, colorId, stockQty, price, salePrice }));
    } catch {
        res.status(400).json({ error: 'Erro ao criar SKU' });
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await ProductSkuService.updateSku(id, req.body));
    } catch {
        res.status(404).json({ error: 'SKU não encontrado' });
    }
}

export async function remove(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        const result = await ProductSkuService.deleteSku(id);
        res.json(result); // { action: 'deleted' | 'deactivated' }
    } catch {
        res.status(404).json({ error: 'SKU não encontrado' });
    }
}

/**
 * O que ja foi apagado neste produto, para a tela nao oferecer de novo.
 *
 * Sem isto a tela so lembra enquanto o produto esta aberto: fecha, reabre, e a
 * grade implicita (cor x tamanho) monta tudo outra vez. A Chris apagava,
 * reabria, via tudo de volta e apagava de novo — o banco ja estava certo, a
 * tela e que nao perguntava.
 */
export async function apagadas(req: Request, res: Response) {
    try {
        const productId = String(req.params.productId ?? req.params.id ?? '');
        if (!productId) return res.status(400).json({ error: 'Informe o produto.' });
        res.json(await Apagadas.chavesDaTela(productId));
    } catch (error) {
        console.error('Falha ao listar variacoes apagadas:', error);
        // Lista vazia em vez de erro: a tela de produto nao pode deixar de
        // abrir porque esta consulta falhou.
        res.json([]);
    }
}

/**
 * Libera uma combinacao cor+tamanho que estava marcada como apagada.
 * Usado pelo "+ adicionar variacao": e o ato deliberado de trazer de volta.
 */
export async function liberar(req: Request, res: Response) {
    try {
        const productId = String(req.params.productId ?? req.params.id ?? '');
        const { color, size } = req.body ?? {};
        if (!productId || !size) {
            return res.status(400).json({ error: 'Informe o produto e o tamanho.' });
        }
        await Apagadas.desmarcar(productId, color ?? null, String(size));
        res.json({ ok: true });
    } catch (error) {
        console.error('Falha ao liberar variação apagada:', error);
        res.status(500).json({ error: 'Não foi possível liberar esta variação.' });
    }
}
