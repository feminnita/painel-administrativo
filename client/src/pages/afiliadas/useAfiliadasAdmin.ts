import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";
import type { Afiliada, StatusAfiliada } from "./type";

export function useAfiliadasAdmin() {
    const [linhas, setLinhas] = useState<Afiliada[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setLinhas(await api.get<Afiliada[]>("/api/admin/afiliadas"));
        } catch (error) {
            console.error("Erro ao carregar afiliadas:", error);
            toast.error("Erro ao carregar as afiliadas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function mudarStatus(id: string, status: StatusAfiliada) {
        try {
            await api.patch(`/api/admin/afiliadas/${id}`, { status });
            toast.success(
                status === "aprovada" ? "Afiliada aprovada — o link dela já credita."
                    : status === "bloqueada" ? "Bloqueada. O link dela para de creditar."
                        : "Atualizado.",
            );
            await load();
        } catch {
            toast.error("Não foi possível salvar.");
        }
    }

    async function mudarPercentual(id: string, percentual: number) {
        try {
            await api.patch(`/api/admin/afiliadas/${id}`, { percentual });
            // Vale só daqui pra frente: pedido antigo guarda o percentual da época.
            toast.success("Comissão alterada. Vale para as próximas vendas.");
            await load();
        } catch {
            toast.error("Não foi possível salvar.");
        }
    }

    async function registrarPagamento(id: string, valor: number, forma?: string) {
        try {
            await api.post(`/api/admin/afiliadas/${id}/pagamentos`, { valor, forma });
            toast.success("Pagamento registrado.");
            await load();
        } catch {
            toast.error("Não foi possível registrar o pagamento.");
        }
    }

    const pendentes = linhas.filter((l) => l.status === "pendente").length;
    const totalAPagar = linhas.reduce((s, l) => s + Math.max(l.a_pagar, 0), 0);
    const totalVendido = linhas.reduce((s, l) => s + l.vendido, 0);

    return {
        linhas, loading, load,
        mudarStatus, mudarPercentual, registrarPagamento,
        pendentes, totalAPagar, totalVendido,
    };
}
