import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import { emptyHomeBanners } from "./mappers";
import type { CategoryBannerInput, HomeBannersSettings } from "./types";

const KEYS = {
    intermediateBanner: "home_intermediate_banner",
    videoSection: "home_video_section",
    imageGrid: "home_image_grid",
    categoryBanners: "home_category_banners",
} as const;

// Banner de categoria: só JPG/WebP e no máximo 600 KB (checado antes de subir).
const CATEGORY_BANNER_MAX_BYTES = 600 * 1024;
const CATEGORY_BANNER_TYPES = ["image/jpeg", "image/webp"];

function validateCategoryBannerFile(file: File): string | null {
    if (!CATEGORY_BANNER_TYPES.includes(file.type)) {
        return "Formato inválido — use apenas JPG ou WebP (banner de categoria).";
    }
    if (file.size > CATEGORY_BANNER_MAX_BYTES) {
        return "Imagem acima de 600 KB — comprima antes de subir (banner de categoria: máx 600 KB, JPG ou WebP).";
    }
    return null;
}

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

            const storedVideo = map[KEYS.videoSection];

            setSettings({
                intermediateBanner: map[KEYS.intermediateBanner] ?? {
                    src: "",
                    alt: "",
                    href: "",
                },
                videoSection: {
                    desktopUrl: storedVideo?.desktopUrl ?? "",
                    mobileUrl: storedVideo?.mobileUrl ?? "",
                    href: storedVideo?.href ?? "",
                },
                imageGrid: Array.isArray(map[KEYS.imageGrid]?.images)
                    ? map[KEYS.imageGrid]
                    : { images: [] },
                categoryBanners: Array.isArray(map[KEYS.categoryBanners])
                    ? map[KEYS.categoryBanners]
                    : [],
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

    const setVitrineHref = (href: string) =>
        setSettings((prev) => ({
            ...prev,
            videoSection: { ...prev.videoSection, href },
        }));

    const uploadVitrineVideo = async (
        kind: "desktopUrl" | "mobileUrl",
        file: File,
    ) => {
        setUploading(true);
        try {
            const url = await uploadTo(file, "Vitrine");
            setSettings((prev) => ({
                ...prev,
                videoSection: { ...prev.videoSection, [kind]: url },
            }));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const clearVitrineVideo = (kind: "desktopUrl" | "mobileUrl") =>
        setSettings((prev) => ({
            ...prev,
            videoSection: { ...prev.videoSection, [kind]: "" },
        }));

    const addGridImage = () =>
        setSettings((prev) => ({
            ...prev,
            imageGrid: {
                images: [
                    ...prev.imageGrid.images,
                    { src: "", alt: "", title: "", href: "", active: true },
                ],
            },
        }));

    const moveGridImage = (index: number, dir: -1 | 1) =>
        setSettings((prev) => {
            const target = index + dir;
            if (target < 0 || target >= prev.imageGrid.images.length) return prev;
            const images = [...prev.imageGrid.images];
            const [item] = images.splice(index, 1);
            images.splice(target, 0, item);
            return { ...prev, imageGrid: { images } };
        });

    const updateGridImage = (
        index: number,
        patch: Partial<{
            src: string;
            alt: string;
            title: string;
            href: string;
            active: boolean;
        }>,
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
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
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
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const addCategoryBanner = () =>
        setSettings((prev) => ({
            ...prev,
            categoryBanners: [
                ...prev.categoryBanners,
                {
                    categorySlug: "",
                    desktopSrc: "",
                    mobileSrc: "",
                    title: "",
                    subtitle: "",
                    href: "",
                    active: true,
                },
            ],
        }));

    const updateCategoryBanner = (
        index: number,
        patch: Partial<CategoryBannerInput>,
    ) =>
        setSettings((prev) => ({
            ...prev,
            categoryBanners: prev.categoryBanners.map((b, i) =>
                i === index ? { ...b, ...patch } : b,
            ),
        }));

    const removeCategoryBanner = (index: number) =>
        setSettings((prev) => ({
            ...prev,
            categoryBanners: prev.categoryBanners.filter((_, i) => i !== index),
        }));

    const uploadCategoryBanner = async (
        index: number,
        kind: "desktopSrc" | "mobileSrc",
        file: File,
    ) => {
        const error = validateCategoryBannerFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Categoria");
            updateCategoryBanner(index, { [kind]: url });
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/settings/${KEYS.intermediateBanner}`, settings.intermediateBanner);
            await api.put(`/api/admin/settings/${KEYS.videoSection}`, settings.videoSection);
            await api.put(`/api/admin/settings/${KEYS.imageGrid}`, {
                images: settings.imageGrid.images.map((img, i) => ({
                    ...img,
                    order: i,
                })),
            });
            await api.put(`/api/admin/settings/${KEYS.categoryBanners}`, settings.categoryBanners);
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
        setVitrineHref,
        uploadVitrineVideo,
        clearVitrineVideo,
        addGridImage,
        moveGridImage,
        updateGridImage,
        removeGridImage,
        uploadIntermediateBanner,
        uploadGridImage,
        addCategoryBanner,
        updateCategoryBanner,
        removeCategoryBanner,
        uploadCategoryBanner,
        handleSave,
    };
}
