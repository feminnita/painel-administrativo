import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { Slide, SlideInput } from "./types";
import { mapApiSlide, toApiSlide, buildSlidePayload, emptySlide } from "./mappers";

export function useSlidesAdmin() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [editing, setEditing] = useState<(SlideInput & { id?: string }) | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api.get<Record<string, any>[]>("/api/admin/hero-slides");
            setSlides(data.map(mapApiSlide));
        } catch (err) {
            console.error("Erro ao carregar slides:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openNew = () => setEditing(emptySlide(slides.length));
    const openEdit = (slide: Slide) => setEditing({ ...slide });

    const uploadTo = async (file: File, folder: string) => {
        const { urls } = await api.upload(
            `/api/admin/upload?folder=${encodeURIComponent(folder)}`,
            [file],
        );
        return urls[0];
    };

    const uploadMedia = async (file: File) => {
        setUploading(true);
        try {
            const folder = file.type.startsWith("video/")
                ? "Banners/Carrosel/Videos"
                : "Banners/Carrosel/Images";
            const url = await uploadTo(file, folder);
            setEditing((prev) => (prev ? { ...prev, src: url } : prev));
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const uploadMobile = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Carrosel/Images");
            setEditing((prev) => (prev ? { ...prev, src_mobile: url } : prev));
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const uploadPoster = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Carrosel/Images");
            setEditing((prev) => (prev ? { ...prev, poster: url } : prev));
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!editing) return;
        if (editing.type === "video") {
            if (!editing.src) return;
        } else if (!editing.src_mobile) {
            alert("A imagem mobile é obrigatória.");
            return;
        }
        setSaving(true);
        try {
            const payload = toApiSlide(buildSlidePayload(editing));
            if (editing.id) {
                await api.put(`/api/admin/hero-slides/${editing.id}`, payload);
            } else {
                await api.post("/api/admin/hero-slides", payload);
            }
            setEditing(null);
            load();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar slide");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este slide?")) return;
        try {
            await api.delete(`/api/admin/hero-slides/${id}`);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao excluir");
        }
        load();
    };

    const move = async (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= slides.length) return;
        const reordered = [...slides];
        const [item] = reordered.splice(index, 1);
        reordered.splice(target, 0, item);
        setSlides(reordered);
        try {
            await api.put("/api/admin/hero-slides/reorder", {
                ids: reordered.map((s) => s.id),
            });
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao reordenar");
        }
        load();
    };

    const toggleActive = async (slide: Slide) => {
        try {
            await api.put(`/api/admin/hero-slides/${slide.id}`, { active: !slide.active });
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao atualizar");
        }
        load();
    };

    return {
        openNew,
        openEdit,
        editing,
        setEditing,
        slides,
        loading,
        saving,
        uploading,
        uploadMedia,
        uploadMobile,
        uploadPoster,
        handleSave,
        handleDelete,
        toggleActive,
        move,
    };
}
