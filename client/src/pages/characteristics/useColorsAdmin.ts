import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "../../components/confirm/ConfirmProvider";
import { api, ApiError } from "../../lib/api/client";
import { emptyColor } from "./domain";
import { mapApiColor, toApiColor } from "./mappers";
import type { Color, ColorInput } from "./types";

const PAGE_SIZE = 40;

export function useColorsAdmin() {
    const [colors, setColors] = useState<Color[]>([]);
    const [editing, setEditing] = useState<(ColorInput & { id?: string }) | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const [onlyMissingImage, setOnlyMissingImage] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const confirm = useConfirm();

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

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [search, onlyMissingImage]);

    const term = search.trim().toLowerCase();
    const filtered = colors.filter((c) => {
        if (onlyMissingImage && c.image_url) return false;
        if (term && !c.name.toLowerCase().includes(term)) return false;
        return true;
    });

    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;
    const showMore = () => setVisibleCount((v) => v + PAGE_SIZE);

    const missingImageCount = colors.filter((c) => !c.image_url).length;

    const openNew = () => setEditing(emptyColor());
    const openEdit = (color: Color) => setEditing({ ...color });

    const uploadImage = async (file: File) => {
        setUploading(true);
        try {
            const { urls } = await api.upload("/api/admin/upload?folder=Colors", [file]);
            setEditing((prev) => (prev ? { ...prev, image_url: urls[0] } : prev));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
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
            toast.error(err instanceof ApiError ? err.message : "Erro ao salvar cor");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirm({
            title: "Excluir cor",
            message: "Produtos que usam essa cor podem perder a variação. Excluir mesmo assim?",
            confirmLabel: "Excluir",
            danger: true,
        }))) return;

        try {
            await api.delete(`/api/admin/colors/${id}`);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Erro ao excluir");
        }
        load();
    };

    return {
        colors,
        filtered,
        visible,
        hasMore,
        showMore,
        missingImageCount,
        search,
        setSearch,
        onlyMissingImage,
        setOnlyMissingImage,
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
