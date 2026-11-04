import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";
import type { SalesPeriod, SalesReport } from "./type";

export function useVendasAdmin() {
    const [period, setPeriod] = useState<SalesPeriod>({ days: 30 });
    const [report, setReport] = useState<SalesReport | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);

        const query = "from" in period
            ? `from=${period.from}&to=${period.to}`
            : `days=${period.days}`;

        try {
            const data = await api.get<SalesReport>(
                `/api/admin/reports/sales?${query}`,
            );
            setReport(data);
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            toast.error('Erro ao carregar o relatório de vendas');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        load();
    }, [load]);

    return { report, loading, period, setPeriod, load };
}
