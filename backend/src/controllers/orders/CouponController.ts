import { Request, Response } from 'express';
import * as CouponService from '../../repository/orders/CouponRepository';

function normalizePrice(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;

    return Number(value).toFixed(2);
}

export async function list(req: Request, res: Response) {
    res.json(await CouponService.findAll());
}

export async function getOne(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        res.json(await CouponService.findById(id));
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'Cupom não encontrado' });
    }
}

export async function create(req: Request, res: Response) {

    try {

        const { code, type, value, minOrderValue, maxUses, expiresAt } = req.body;

        if (!code || !type || value === undefined) {
            return res.json({ error: 'Preencha os campos Obrigatórios' });
        }

        const coupon = await CouponService.insert({
            code: code.toUpperCase().trim(),
            type,
            value: normalizePrice(value)!,
            minOrderValue: normalizePrice(minOrderValue),
            maxUses: maxUses ?? null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        if (coupon) {
            res.status(201).json(coupon);
        } else {
            return res.status(409).json({ error: 'Já exite um cupom cadastrado com esse código' })
        }

    } catch (error) {
        console.error('Error ao criar cupom:', error);
        res.status(400).json({ error: 'Erro ao criar cupom, verifique os campos e tente novamente' });
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        const values: Record<string, unknown> = { ...req.body };

        if ('value' in values) values.value = normalizePrice(values.value);
        if ('minOrderValue' in values) values.minOrderValue = normalizePrice(values.minOrderValue);
        if ('expiresAt' in values) values.expiresAt = values.expiresAt ? new Date(values.expiresAt as string) : null;
        if ('active' in values) {
            values.active = values.active === true || values.active === 'true';
        }
        res.json(await CouponService.update(id, values));

    } catch (error) {
        console.error('Erro ao atualizar cupom:', error);
        res.status(404).json({ error: 'Cupom não encontrado' });
    }
};

export async function deleteCoupon(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        await CouponService.deleteCoupon(id);
        res.status(204).send();
    } catch (error) {
        if ((error as { code?: string }).code === '23503') {
            return res.status(409).json({ error: 'Cupom já usado em pedidos, desative em vez de excluir' })
        }
        res.status(404).json({ error: 'Cupon não encontrado' });
    }
}