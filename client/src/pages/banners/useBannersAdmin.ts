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

// Faixa (grade de imagens da home): o site suporta de 1 a 5 blocos
// (com 5 → md:grid-cols-5). Limite máximo de imagens na faixa.
export const MAX_GRID_IMAGES = 5;

// Banner (categoria/intermediário/faixa): JPG/PNG/WebP, até 4 MB. Regra Cloudinary —
// subir o original, a otimização é na entrega; o limite antigo de 600 KB/só-JPG barrava a arte real.
const BANNER_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateBannerImageFile(file: File): string | null {
    if (!BANNER_IMAGE_TYPES.includes(file.type)) {
        return "Formato inválido — use JPG, PNG ou WebP.";
    }
    if (file.size > BANNER_IMAGE_MAX_BYTES) {
        return "Imagem acima de 4 MB — comprima antes de subir (máx 4 MB).";
    }
    return null;
}

// Vídeo da vitrine: MP4/WebM/MOV, até 50 MB (mesmo teto do multer no backend).
const BANNER_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const BANNER_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function validateBannerVideoFile(file: File): string | null {
    if (!BANNER_VIDEO_TYPES.includes(file.type)) {
        return `Formato de vídeo inválido (${file.type || "desconhecido"}) — use MP4, WebM ou MOV.`;
    }
    if (file.size > BANNER_VIDEO_MAX_BYTES) {
        return "Vídeo acima de 50 MB — comprima antes de subir (máx 50 MB).";
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
                intermediateBanner: {
                    src: "",
                    srcMobile: "",
                    alt: "",
                    href: "",
                    ...(map[KEYS.intermediateBanner] ?? {}),
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
        const error = validateBannerVideoFile(file);
        if (error) {
            toast.error(error);
            return;
        }
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
        setSettings((prev) => {
            if (prev.imageGrid.images.length >= MAX_GRID_IMAGES) return prev;
            return {
                ...prev,
                imageGrid: {
                    images: [
                        ...prev.imageGrid.images,
                        { src: "", srcMobile: "", alt: "", title: "", href: "", active: true },
                    ],
                },
            };
        });

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
            srcMobile: string;
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
        const error = validateBannerImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
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

    const uploadIntermediateBannerMobile = async (file: File) => {
        const error = validateBannerImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Banner Inter");
            setIntermediateBanner({ srcMobile: url });
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Falha no upload");
        } finally {
            setUploading(false);
        }
    };

    const uploadGridImage = async (index: number, file: File) => {
        const error = validateBannerImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
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

    const uploadGridImageMobile = async (index: number, file: File) => {
        const error = validateBannerImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        setUploading(true);
        try {
            const url = await uploadTo(file, "Banners/Grid Images");
            updateGridImage(index, { srcMobile: url });
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
        const error = validateBannerImageFile(file);
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
        // Banner de categoria SEM imagem não pode ser salvo em silêncio (a cliente
        // salvou achando que a arte tinha subido, mas o upload não anexou).
        const semImagem = settings.categoryBanners.filter(
            (b) => !b.desktopSrc && !b.mobileSrc,
        );
        if (semImagem.length > 0) {
            const nomes = semImagem
                .map((b) => b.categorySlug || "(sem categoria)")
                .join(", ");
            toast.error(
                `Banner de categoria sem imagem: ${nomes}. Suba a imagem (desktop e/ou mobile) ou remova esse banner antes de salvar.`,
            );
            return;
        }

        // Banner intermediário: se tem qualquer conteúdo mas a imagem desktop está
        // vazia, não salvar em silêncio (mobile é opcional; desktop é obrigatório).
        const inter = settings.intermediateBanner;
        const interComConteudo =
            !!inter.alt || !!inter.href || !!inter.srcMobile;
        if (interComConteudo && !inter.src) {
            toast.error(
                "Banner intermediário sem imagem desktop. Suba a imagem desktop ou limpe os campos antes de salvar.",
            );
            return;
        }

        // Faixa: nenhum bloco pode ficar sem imagem desktop (mobile é opcional).
        const faixaSemImagem = settings.imageGrid.images.filter((img) => !img.src);
        if (faixaSemImagem.length > 0) {
            const nomes = faixaSemImagem
                .map((img) => img.title || img.alt || "(sem título)")
                .join(", ");
            toast.error(
                `Bloco da faixa sem imagem desktop: ${nomes}. Suba a imagem desktop ou remova o bloco antes de salvar.`,
            );
            return;
        }

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
        uploadIntermediateBannerMobile,
        uploadGridImage,
        uploadGridImageMobile,
        addCategoryBanner,
        updateCategoryBanner,
        removeCategoryBanner,
        uploadCategoryBanner,
        handleSave,
    };
}
