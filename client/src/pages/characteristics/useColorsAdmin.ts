import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { emptyColor } from "./domain";
import { mapApiColor, toApiColor } from "./mappers";
import type { Color, ColorInput } from "./types";

export function useColorsAdmin() {
    const [colors, setColors] = useState<Color[]>([]);
    const [editing, setEditing] = useState<(ColorInput & { id?: string }) | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api.get<Record<string, any>[]>("/api/admin/colors");
            setColors(data.map(mapApiColor));
        } catch (err) {
            console.error("Erro ao carregar cores:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openNew = () => setEditing(emptyColor());
    const openEdit = (color: Color) => setEditing({ ...color });

    const uploadImage = async (file: File) => {
        setUploading(true);
        try {
            const { urls } = await api.upload("/api/admin/upload?folder=Colors", [file]);
            setEditing((prev) => (prev ? { ...prev, image_url: urls[0] } : prev));
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!editing || !editing.name || !editing.image_url) return;
        setSaving(true);
        try {
            const body = toApiColor(editing);
            if (editing.id) {
                await api.put(`/api/admin/colors/${editing.id}`, body);
            } else {
                await api.post("/api/admin/colors", body);
            }
            setEditing(null);
            load();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar cor");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta cor?")) return;
        try {
            await api.delete(`/api/admin/colors/${id}`);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao excluir");
        }
        load();
    };

    return {
        colors,
        editing,
        setEditing,
        loading,
        saving,
        uploading,
        openNew,
        openEdit,
        uploadImage,
        handleSave,
        handleDelete,
    };
}
