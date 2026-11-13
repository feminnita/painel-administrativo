import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { AdminCustomer, BloqueioCliente, CustomerDetail, EventoBloqueio } from "./types";

export function useCustomersAdmin() {
    const [customers, setCustomers] = useState<AdminCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [detail, setDetail] = useState<CustomerDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<AdminCustomer[]>("/api/admin/customers");
            setCustomers(data);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            toast.error("Erro ao carregar as clientes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const data = await api.get<CustomerDetail>(`/api/admin/customers/${id}`);
            setDetail(data);
        } catch (error) {
            console.error("Erro ao carregar cliente:", error);
            toast.error("Erro ao carregar o histórico da cliente");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => setDetail(null);

    // Bloqueio é pelo CPF: vale para todas as contas da mesma pessoa no site.
    const alternarBloqueio = async () => {
        if (!detail) return;
        const id = detail.customer.id;
        type Resposta = { bloqueio: BloqueioCliente; historicoBloqueio: EventoBloqueio[] };
        try {
            let r: Resposta;
            if (detail.bloqueio) {
                const motivo = window.prompt(
                    `Desbloquear ${detail.customer.name}? Ela volta a poder comprar no site.\n\nMotivo do desbloqueio:`,
                );
                if (motivo === null) return;
                r = await api.post<Resposta>(`/api/admin/customers/${id}/desbloqueio`, { motivo: motivo.trim() });
                toast.success("Cliente desbloqueada");
            } else {
                const motivo = window.prompt(
                    `Bloquear ${detail.customer.name}? Ela não vai conseguir fechar pedido no site, nem com outra conta do mesmo CPF.\n\nMotivo:`,
                );
                if (!motivo?.trim()) return;
                r = await api.post<Resposta>(`/api/admin/customers/${id}/bloqueio`, { motivo: motivo.trim() });
                toast.success("Cliente bloqueada");
            }
            setDetail({ ...detail, bloqueio: r.bloqueio, historicoBloqueio: r.historicoBloqueio });
            load();
        } catch (error) {
            console.error("Erro ao mudar bloqueio:", error);
            toast.error(error instanceof Error ? error.message : "Erro ao mudar o bloqueio");
        }
    };

    const term = search.trim().toLowerCase();
    const filtered = term
        ? customers.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                c.email.toLowerCase().includes(term) ||
                (c.cpf ?? "").includes(term),
        )
        : customers;

    return {
        customers,
        filtered,
        loading,
        search,
        setSearch,
        detail,
        detailLoading,
        openDetail,
        closeDetail,
        alternarBloqueio,
        load,
    };
}
