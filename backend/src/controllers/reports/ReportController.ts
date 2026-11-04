import { Request, Response } from 'express';
import * as ReportRepository from '../../repository/reports/ReportRepository';

export async function sales(req: Request, res: Response) {
    try {
        const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
        const data = /^\d{4}-\d{2}-\d{2}$/;
        const from = String(req.query.from ?? '');
        const to = String(req.query.to ?? '');
        const intervalo = data.test(from) && data.test(to) && from <= to;
        const periodo: ReportRepository.Periodo = intervalo ? { from, to } : { days };

        const [summary, byDay, top, byMethod, sold] = await Promise.all([
            ReportRepository.salesSummary(periodo),
            ReportRepository.salesByDay(periodo),
            ReportRepository.topProducts(periodo),
            ReportRepository.salesByPaymentMethod(periodo),
            ReportRepository.itemsSold(periodo),
        ]);

        res.json({
            days,
            from: intervalo ? from : null,
            to: intervalo ? to : null,
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
export async function searches(req: Request, res: Response) {
    try {
        const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 365);
        const [termos, resumo] = await Promise.all([
            ReportRepository.buscasSemResultado(dias),
            ReportRepository.resumoDeBuscas(dias),
        ]);
        res.json({ dias, resumo, termos });
    } catch (error) {
        console.error('Falha no relatorio de buscas:', error);
        res.status(500).json({ error: 'Não foi possível carregar o relatório de buscas.' });
    }
}
