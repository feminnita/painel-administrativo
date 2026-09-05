import { Request, Response } from 'express';
import * as ProductColorService from '../../services/product/ProductColorService';

export async function list(req: Request, res: Response) {
    res.json(await ProductColorService.listColors());
}

export async function getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await ProductColorService.getColor(id));
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'Cor não encontrada' });
    }
}

export async function create(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        const { name, imageUrl, force } = req.body;
        const color = await ProductColorService.createColor({ name, imageUrl, force: force === true });
        res.status(201).json(color);
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'Error ao criar cor - confira se o nome já esxite' });
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        res.json(await ProductColorService.updateColor(id, req.body));
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'Cor não encontrada' });
    }
}

export async function remove(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        await ProductColorService.deleteColor(id);
        res.status(204).send();
    } catch (error) {
        if (error instanceof Error && error.message === 'COLOR_NOT_FOUND') {
            return res.status(404).json({ error: 'Cor não encontrada' });
        }

        if ((error as { code?: string }).code === '23503') {
            return res.status(409).json({ error: 'Cor em uso, verifique os skus' });
        }

        console.error(error);
        res.status(500).json({ error: 'Error ao remover cor' });
    }
}