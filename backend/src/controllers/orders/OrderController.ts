import { Request, Response } from 'express';
import * as OrderService from '../../services/orders/OrderService';
import { orderStatusEnum } from '../../config/db/schema';

export async function list(req: Request, res: Response) {
    const { status, search, from, to, includeCancelled } = req.query;

    const isValidStatus =
        typeof status === 'string' &&
        orderStatusEnum.enumValues.includes(status as never);

    res.json(
        await OrderService.listOrders({
            status: isValidStatus ? (status as never) : undefined,
            search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
            from: typeof from === 'string' && from ? from : undefined,
            to: typeof to === 'string' && to ? to : undefined,
            includeCancelled: includeCancelled === 'true' || includeCancelled === '1',
        }),
    );
}

export async function getOne(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        res.json(await OrderService.getOrder(id));
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'Pedido não encontrado' });
    }
}

export async function updateStatus(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        const { status, paymentStatus } = req.body;
        res.json(await OrderService.updateOrderStatus(id, { status, paymentStatus }));
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : '';
        if (message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Pedido nao encontrado' });
        if (message === 'INVALID_STATUS' || message === 'INVALID_PAYMENT_STATUS') {
            return res.status(400).json({ error: 'Status inválido' });
        }

        res.status(400).json({ error: 'Nada para atualizar - envie status e/ou paymentStatus' })
    }
}

export async function setTracking(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        res.json(await OrderService.setManualTracking(id, String(req.body.trackingCode ?? '')));
    } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Pedido não encontrado' });
        if (message === 'TRACKING_REQUIRED') return res.status(400).json({ error: 'Informe o código de rastreio' });
        console.error(`Erro ao salvar rastreio do pedido ${id}:`, err);
        res.status(500).json({ error: 'Erro ao salvar rastreio' });
    }
}
