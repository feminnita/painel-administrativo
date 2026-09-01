import { useCallback, useEffect, useState } from "react";
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api/client';
import type { ShippingConfig } from "./type";

export function useFreteAdmin() {
    const [config, setConfig] = useState<ShippingConfig>({
        freeShipingThreshold: null,
        extraDays: 0,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        try {
            const rows = await api.get<{ key: string; value: any }[]>(
                "/api/admin/settings",
            );
            const stored = rows.find((r) => r.key === "shipping_config")?.value;
            setConfig({
                freeShipingThreshold:
                    typeof stored?.freeShipingThreshold === "number"
                        ? stored.freeShippingThreshold
                        : null,
                extraDays: Number(stored?.extraDays) || 0,
            });
        } catch (error) {
            console.error("Erro ao carregar configurações de frete:", error);
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
            await api.put("/api/admin/settings/shipping_config", config);
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