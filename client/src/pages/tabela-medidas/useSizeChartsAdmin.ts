import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import type { SizeChartsSetting, SizeChartType } from "./types";

const SETTING_KEY = "size_charts";
const UPLOAD_FOLDER = "TabelaMedidas";

// Mesma validação dos banners: JPG/PNG/WebP até 4MB.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

export function useSizeChartsAdmin() {
    const [charts, setCharts] = useState<SizeChartsSetting>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploadingType, setUploadingType] = useState<SizeChartType | null>(null);

    const load = useCallback(async () => {
        try {
            const rows = await api.get<{ key: string; value: any }[]>(
                "/api/admin/settings",
            );
            const stored = rows.find((r) => r.key === SETTING_KEY)?.value;
            setCharts(
                stored && typeof stored === "object" && !Array.isArray(stored)
                    ? (stored as SizeChartsSetting)
                    : {},
            );
        } catch (error) {
            console.error("Erro ao carregar tabelas de medidas:", error);
            toast.error("Erro ao carregar as tabelas de medidas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const uploadImage = async (type: SizeChartType, file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error("Formato inválido — envie JPG, PNG ou WebP.");
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error("Imagem muito grande — o limite é 4 MB.");
            return;
        }
        setUploadingType(type);
        try {
            const { urls } = await api.upload(
                `/api/admin/upload?folder=${encodeURIComponent(UPLOAD_FOLDER)}`,
                [file],
            );
            const url = urls?.[0];
            if (!url) throw new Error("O upload não retornou o link da imagem.");
            setCharts((prev) => ({
                ...prev,
                [type]: { ...(prev[type] ?? {}), howToMeasureImage: url },
            }));
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Falha no upload");
        } finally {
            setUploadingType(null);
        }
    };

    const removeImage = (type: SizeChartType) => {
        setCharts((prev) => ({
            ...prev,
            [type]: { ...(prev[type] ?? {}), howToMeasureImage: undefined },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Envia o objeto INTEIRO (name/columns/footer/rows preservados);
            // só howToMeasureImage foi tocado por tipo.
            await api.put(`/api/admin/settings/${SETTING_KEY}`, charts);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    return {
        charts,
        loading,
        saving,
        saved,
        uploadingType,
        uploadImage,
        removeImage,
        handleSave,
    };
}
