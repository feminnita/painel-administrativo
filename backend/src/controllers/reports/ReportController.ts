import { Request, Response } from 'express';
import * as ReportRepository from '../../repository/reports/ReportRepository';

export async function sales(req: Request, res: Response) {
    try {
        const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

        const [summary, byDay, top, byMethod, sold] = await Promise.all([
            ReportRepository.salesSummary(days),
            ReportRepository.salesByDay(days),
            ReportRepository.topProducts(days),
            ReportRepository.salesByPaymentMethod(days),
            ReportRepository.itemsSold(days),
        ]);

        res.json({
            days,
            revenue: summary?.revenue ?? 0,
            orders: summary?.orders ?? 0,
            discounts: summary?.discounts ?? 0,
            shipping: summary?.shipping ?? 0,
            itemsSold: sold?.items ?? 0,
            avgTicket:
                Number(summary?.orders) > 0
                    ? Number(summary?.revenue) / Number(summary?.orders)
                    : 0,
            byDay,
            topProducts: top,
            byPaymentMethod: byMethod,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório de vendas' });
    }
}

export async function visits(req: Request, res: Response) {
    try {
        const rows = await ReportRepository.productVisits();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório de visitisas' });
    }
}