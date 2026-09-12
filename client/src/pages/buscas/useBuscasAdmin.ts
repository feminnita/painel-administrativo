import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";
import type { RelatorioDeBuscas } from "./type";

const VAZIO: RelatorioDeBuscas = {
    dias: 30,
    resumo: { total: 0, sem_resultado: 0, visitas_que_buscaram: 0 },
    termos: [],
};

export function useBuscasAdmin() {
    const [dias, setDias] = useState(30);
    const [dados, setDados] = useState<RelatorioDeBuscas>(VAZIO);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setDados(await api.get<RelatorioDeBuscas>(`/api/admin/reports/buscas?dias=${dias}`));
        } catch (error) {
            console.error("Erro ao carregar buscas:", error);
            toast.error("Erro ao carregar o relatório de buscas");
        } finally {
            setLoading(false);
        }
    }, [dias]);

    useEffect(() => {
        load();
    }, [load]);

    // Quanto da procura termina em nada. E o numero que diz se vale mexer no
    // catalogo: 2% e ruido, 30% e dinheiro saindo pela porta.
    const percentualPerdido = dados.resumo.total
        ? dados.resumo.sem_resultado / dados.resumo.total
        : 0;

    return { ...dados, loading, load, dias, setDias, percentualPerdido };
}
