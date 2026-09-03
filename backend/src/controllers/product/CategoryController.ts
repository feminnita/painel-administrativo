import { Request, Response } from 'express';
import * as CategoryService from '../../services/product/CategoryService';


export async function list(req: Request, res: Response) {
    res.json(await CategoryService.listCategories());
}

export async function getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await CategoryService.getCategory(id));
    } catch (error) {
        res.status(404).json({ Error: 'Categoria não encontrada', error });
    }
}

export async function productCounts(req: Request, res: Response) {
    res.json(await CategoryService.listProductCounts());
}

export async function create(req: Request, res: Response) {

    try {
        const { name, slug, description, imageUrl, parentId, orderIndex, pickOrder } = req.body;
        const category = await CategoryService.createCategory({ name, slug, description, imageUrl, parentId, orderIndex, pickOrder });
        console.log(category);
        res.status(201).json(category);

    } catch (error) {
        console.error(error)
        res.status(400).json({ Error: 'Erro ao criar categoria - confira os campos obrigatórios e se o slug já existe' });
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await CategoryService.updateCategory(id, req.body));
    } catch (error) {
        res.status(404).json({ error: 'Catagoria não encontrada' });
    }
}
export async function deactive(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        await CategoryService.deactvateCategory(id);
        res.status(204).send();
    } catch (error) {
        if ((error as { code?: string }).code === '23503') {
            return res.status(409).json({ error: 'Categoria em uso — remova produtos/subcategorias primeiro' })
        }
        res.status(404).json({ error: 'Categoria não encontrada' });
    }
}

export async function deleteCategory(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        await CategoryService.deleteCategory(id);
        res.status(204).send();
    } catch (error) {
        if ((error as { code?: string }).code === '23503') {
            return res.status(409).json({ error: 'Categoria em uso — remova produtos/subcategorias primeiro' })
        }
        res.status(404).json({ error: 'Categoria não encontrada' });
    }
}

export async function reorder(req: Request, res: Response) {
    try {
        await CategoryService.reorderCategories(req.body.updates);
        res.status(204).send()
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Envie updates: [{id, orderIndex}]' })
    };
}

