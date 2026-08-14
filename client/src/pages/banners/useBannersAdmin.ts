import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { emptyHomeBanners, extractYoutubeId } from "./mappers";
import type { HomeBannersSettings } from "./types";

const KEYS = {
    intermediateBanner: "home_intermediate_banner",
    videoSection: "home_video_section",
    imageGrid: "home_image_grid",
} as const;

export function useHomeBannersAdmin() {
    const [settings, setSettings] =
        useState<HomeBannersSettings>(emptyHomeBanners());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        try {
            const rows = await api.get<{ key: string; value: any }[]>(
                "/api/admin/settings",
            );
            const map: Record<string, any> = {};
            rows.forEach((row) => {
                map[row.key] = row.value;
            });

            setSettings({
                intermediateBanner: map[KEYS.intermediateBanner] ?? {
                    src: "",
                    alt: "",
                    href: "",
                },
                videoSection: map[KEYS.videoSection] ?? { title: "", videoId: "" },
                imageGrid: Array.isArray(map[KEYS.imageGrid]?.images)
                    ? map[KEYS.imageGrid]
                    : { images: [] },
            });
        } catch (err) {
            console.error("Erro ao carregar banners:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setIntermediateBanner = (
        patch: Partial<HomeBannersSettings["intermediateBanner"]>,
    ) =>
        setSettings((prev) => ({
            ...prev,
            intermediateBanner: { ...prev.intermediateBanner, ...patch },
        }));

    const setVideoTitle = (title: string) =>
        setSettings((prev) => ({
            ...prev,
            videoSection: { ...prev.videoSection, title },
        }));

    const setVideoUrl = (raw: string) =>
        setSettings((prev) => ({
            ...prev,
            videoSection: { ...prev.videoSection, videoId: extractYoutubeId(raw) },
        }));

    const addGridImage = () =>
        setSettings((prev) => ({
            ...prev,
            imageGrid: { images: [...prev.imageGrid.images, { src: "", alt: "" }] },
        }));

    const updateGridImage = (
        index: number,
        patch: Partial<{ src: string; alt: string }>,
    ) =>
        setSettings((prev) => ({
            ...prev,
            imageGrid: {
                images: prev.imageGrid.images.map((img, i) =>
                    i === index ? { ...img, ...patch } : img,
                ),
            },
        }));

    const removeGridImage = (index: number) =>
        setSettings((prev) => ({
            ...prev,
            imageGrid: {
                images: prev.imageGrid.images.filter((_, i) => i !== index),
            },
        }));

    const uploadTo = async (file: File, folder: string) => {
        const { urls } = await api.upload(
            `/api/admin/upload?folder=${encodeURIComponent(folder)}`,
            [file],
        );
        return urls[0];
    };

    const uploadIntermediateBanner = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Banner Inter");
            setIntermediateBanner({ src: url });
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const uploadGridImage = async (index: number, file: File) => {
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Grid Images");
            updateGridImage(index, { src: url });
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/settings/${KEYS.intermediateBanner}`, settings.intermediateBanner);
            await api.put(`/api/admin/settings/${KEYS.videoSection}`, settings.videoSection);
            await api.put(`/api/admin/settings/${KEYS.imageGrid}`, settings.imageGrid);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    return {
        settings,
        loading,
        saving,
        saved,
        uploading,
        setIntermediateBanner,
        setVideoTitle,
        setVideoUrl,
        addGridImage,
        updateGridImage,
        removeGridImage,
        uploadIntermediateBanner,
        uploadGridImage,
        handleSave,
    };
}
