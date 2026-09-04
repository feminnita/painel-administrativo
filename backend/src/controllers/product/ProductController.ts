import { Request, Response } from 'express';
import * as ProductService from '../../services/product/ProductService';

function normalizePrice(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return Number(value).toFixed(2);
}

const PRICE_FIELDS = ['basePrice', 'pixPrice', 'salePrice', 'weightKg', 'pkgHeightCm', 'pkgWidthCm', 'pkgLengthCm'];

export async function list(req: Request, res: Response) {
    res.json(await ProductService.listProducts());
}

export async function getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await ProductService.getProduct(id));
    } catch {
        res.status(404).json({ error: 'Produto não encontrado' });
    }
}

export async function saveFull(req: Request, res: Response) {
    const id = req.params.id as string | undefined;
    try {
        const product: Record<string, unknown> = { ...req.body.product };
        for (const field of PRICE_FIELDS) {
            if (field in product) product[field] = normalizePrice(product[field]);
        }
        delete product.id;
        delete product.createdAt;

        const savedId = await ProductService.saveFullProduct(
            { product, skus: req.body.skus, colorImages: req.body.colorImages },
            id,
        );
        res.status(id ? 200 : 201).json({ id: savedId });
    } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message === 'PRODUCT_NOT_FOUND') return res.status(404).json({ error: 'Produto não encontrado' });
        if (message === 'NAME_REQUIRED') return res.status(400).json({ error: 'Nome é obrigatório' });
        if (message.startsWith('COLOR_NOT_REGISTERED')) {
            return res.status(400).json({ error: `Cor não cadastrada em Características: ${message.split(':')[1]}` });
        }
        console.error(`Erro ao salvar produto ${id ?? '(novo)'}:`, err);
        // Painel é admin-only: devolver a causa REAL (mensagem + código Postgres +
        // coluna/constraint) em vez de texto genérico. Sem isso a cliente fica no
        // escuro e depende de log do Render pra saber o motivo de um 500.
        const e = err as { message?: string; code?: string; detail?: string; column?: string; constraint?: string };
        const causa = [e?.message ?? String(err), e?.code && `[pg ${e.code}]`, e?.column && `coluna ${e.column}`, e?.constraint && `constraint ${e.constraint}`]
            .filter(Boolean)
            .join(' · ');
        // A causa vai no próprio `error` pra aparecer na tela (o front mostra err.message).
        res.status(500).json({
            error: `Erro ao salvar produto: ${causa}`,
            detail: e?.message ?? String(err),
            code: e?.code,
            column: e?.column,
            constraint: e?.constraint,
            pgDetail: e?.detail,
        });
    }
}

export async function colorImages(req: Request, res: Response) {
    const id = req.params.id as string;
    res.json(await ProductService.listColorImages(id));
}

export async function setActive(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await ProductService.updateProduct(id, { active: Boolean(req.body.active) }));
    } catch {
        res.status(404).json({ error: 'Produto não encontrado' });
    }
}

export async function bulk(req: Request, res: Response) {
    try {
        await ProductService.bulkAction(req.body.ids, req.body.action);
        res.status(204).send();
    } catch (err) {
        if (err instanceof Error && err.message === 'PRODUCT_HAS_ORDERS') {
            return res.status(409).json({ error: 'Um dos produtos tem pedidos — desative em vez de excluir' });
        }
        res.status(400).json({ error: 'Envie ids: [] e action: activate | deactivate | delete' });
    }
}

export async function remove(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        await ProductService.deleteProducts([id]);
        res.status(204).send();
    } catch (err) {
        if (err instanceof Error && err.message === 'PRODUCT_HAS_ORDERS') {
            return res.status(409).json({ error: 'Produto tem pedidos — desative em vez de excluir' });
        }
        res.status(404).json({ error: 'Produto não encontrado' });
    }
}
