import { Request, Response } from 'express';
import * as ProductService from '../../services/product/ProductService';

function normalizePrice(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return Number(value).toFixed(2);
}

const PRICE_FIELDS = ['basePrice', 'pixPrice', 'salePrice', 'costPrice', 'weightKg', 'pkgHeightCm', 'pkgWidthCm', 'pkgLengthCm'];
const DATE_FIELDS = ['saleStart', 'saleEnd'];

function normalizeDate(value: unknown): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
}

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
        for (const field of DATE_FIELDS) {
            if (field in product) product[field] = normalizeDate(product[field]);
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
        const resultado = await ProductService.bulkAction(req.body.ids, req.body.action);
        // So a exclusao devolve contagem (apagados x arquivados); ativar/desativar segue sem corpo.
        if (req.body.action === 'delete') return res.json(resultado);
        res.status(204).send();
    } catch (err) {
        if (err instanceof Error && err.message === 'NO_IDS') {
            return res.status(400).json({ error: 'Envie ids: [] e action: activate | deactivate | delete' });
        }
        console.error('[produtos] acao em massa falhou', err);
        res.status(500).json({ error: 'Não foi possível concluir. Tente de novo.' });
    }
}

export async function remove(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await ProductService.deleteProducts([id]));
    } catch (err) {
        // Antes todo erro virava "Produto nao encontrado", inclusive os que nada
        // tinham a ver com isso. Agora o motivo real fica no log do servidor.
        console.error('[produtos] exclusao falhou', id, err);
        res.status(500).json({ error: 'Não foi possível excluir. Tente de novo.' });
    }
}
