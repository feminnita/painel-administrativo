import { useCallback, useEffect, useState } from "react";
import { toast } from 'sonner';
import { api } from '../../lib/api/client';
import type { ProductVisit } from "./type";

export function useVisitasAdmin() {
    const [rows, setRows] = useState<ProductVisit[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const data = await api.get<ProductVisit[]>("/api/admin/reports/visits");
            setRows(data);
        } catch (error) {
            console.error("Erro ao carregar visitas:", error);
            toast.error("Erro ao carregar o relatório de visitas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalVisits = rows.reduce((sum, r) => sum + r.visits, 0);
    const totalSold = rows.reduce((sum, r) => sum + r.sold, 0);
    const avgConversion = totalVisits > 0 ? totalSold / totalVisits : 0;

    return { rows, loading, load, totalVisits, avgConversion };
}