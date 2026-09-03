import { Request, Response } from 'express';
import * as ProductSkuService from '../../services/product/ProductSkuService';

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
