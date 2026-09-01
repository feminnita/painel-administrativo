import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api/client";
import type { MinOrderConfig } from "./type";

// Default quando a chave `store_min_order` ainda não existe: ativo=true, valor=199.
const DEFAULT_CONFIG: MinOrderConfig = { ativo: true, valor: 199 };

export function usePedidoMinimoAdmin() {
    const [config, setConfig] = useState<MinOrderConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        try {
            const rows = await api.get<{ key: string; value: any }[]>(
                "/api/admin/settings",
            );
            const stored = rows.find((r) => r.key === "store_min_order")?.value;
            setConfig({
                ativo:
                    typeof stored?.ativo === "boolean"
                        ? stored.ativo
                        : DEFAULT_CONFIG.ativo,
                valor:
                    typeof stored?.valor === "number"
                        ? stored.valor
                        : DEFAULT_CONFIG.valor,
            });
        } catch (error) {
            console.error("Erro ao carregar pedido mínimo:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/api/admin/settings/store_min_order", config);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    return { config, setConfig, loading, saving, saved, handleSave };
}
