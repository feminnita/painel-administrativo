import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";
import type { SalesReport } from "./type";

export function useVendasAdmin() {
    const [days, setDays] = useState(30);
    const [report, setReport] = useState<SalesReport | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const data = await api.get<SalesReport>(
                `/api/admin/reports/sales?days=${days}`,
            );
            setReport(data);
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            toast.error('Erro ao carregar o relatório de vendas');
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        load();
    }, [load]);

    return { report, loading, days, setDays, load };
}