import { Request, Response } from 'express';
import * as ShippingService from '../../services/shipping/ShippingService';

export async function buyLabel(req: Request, res: Response) {
    const orderId = req.params.orderId as string;

    try {
        const order = await ShippingService.buyLabel(orderId);

        res.json({ lebelUrl: order.labelUrl, trackingCode: order.trackingCode });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao comprar Etiqueta';

        if (message === 'ORDER_NOT_FOUND') return res.status(404).json({
            error: 'Pedido não encontrado'
        });

        if (message === 'ORDER_NOT_PAID') return res.status(409).json({ error: 'Pedido ainda não foi pago' });
        if (message === 'LABEL_ALREADY_EXISTS') return res.status(409).json({ error: 'Etiqueta já comprada para este pedido' });
        console.error(`Erro ao comprar etiqueta do pedido ${orderId}:`, error);
        res.status(502).json({ error: message });
    }
}

export async function refreshTracking(req: Request, res: Response) {
    const orderId = req.params.orderId as string;

    try {
        const order = await ShippingService.refreshTracking(orderId);
        res.json({ trackingCode: order.trackingCode });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar rastreio';

        if (message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Pedido não encontrado' });
        if (message === 'ORDER_HAS_NO_SHIPMENT') return res.status(409).json({ error: 'Pedido ainda não tem código de rastreio' })
        console.error(`Erro ao atualizar ratreio do pedido ${orderId}:`, error);
        res.status(502).json({ error: message });
    }
}