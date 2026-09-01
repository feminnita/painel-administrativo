import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { AdminCustomer, CustomerDetail } from "./types";

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
        load,
    };
}
