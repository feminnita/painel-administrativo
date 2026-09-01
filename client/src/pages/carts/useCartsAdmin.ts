import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";
import type { AbandonedCart } from "./types";

export function useCartsAdmin() {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const data = await api.get<AbandonedCart[]>("/api/admin/carts");
            setCarts(data);
        } catch (error) {
            console.error("Erro ao carregar carrinhos:", error);
            toast.error("Erro ao carregar os carrinhos abandonados");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalValue = carts.reduce((sum, c) => sum + c.total, 0);

    return {
        carts,
        loading,
        load,
        totalValue
    };
}
