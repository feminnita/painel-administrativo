import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { mapApiProduct } from "../product/mappers";
import type { AdminProduct } from "../product/types";

// Seções da home do site (client/src/app/page.tsx): Lançamentos, Mais Vendidos e
// Outlet. As chaves batem com o contrato de dados salvo em settings.home_sections.
export const SECTIONS = [
    { key: "lancamentos", label: "Lançamentos" },
    { key: "maisVendidos", label: "Mais Vendidos" },
    { key: "outlet", label: "Outlet" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export type HomeSections = Record<SectionKey, string[]>;

const SETTING_KEY = "home_sections";
// Quantos produtos aparecem por seção na home.
export const SECTION_LIMIT = 8;

function emptySections(): HomeSections {
    return { lancamentos: [], maisVendidos: [], outlet: [] };
}

export function useVitrineAdmin() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [sections, setSections] = useState<HomeSections>(emptySections());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [prods, rows] = await Promise.all([
                api.get<Record<string, any>[]>("/api/admin/products"),
                api.get<{ key: string; value: any }[]>("/api/admin/settings"),
            ]);
            setProducts(prods.map(mapApiProduct));

            const stored = rows.find((r) => r.key === SETTING_KEY)?.value;
            setSections({
                lancamentos: Array.isArray(stored?.lancamentos) ? stored.lancamentos : [],
                maisVendidos: Array.isArray(stored?.maisVendidos)
                    ? stored.maisVendidos
                    : [],
                outlet: Array.isArray(stored?.outlet) ? stored.outlet : [],
            });
        } catch (err) {
            console.error("Erro ao carregar vitrine:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const productById = useCallback(
        (id: string) => products.find((p) => p.id === id),
        [products],
    );

    const addProduct = (section: SectionKey, id: string) =>
        setSections((prev) => {
            if (prev[section].includes(id)) return prev;
            if (prev[section].length >= SECTION_LIMIT) return prev;
            return { ...prev, [section]: [...prev[section], id] };
        });

    const removeProduct = (section: SectionKey, id: string) =>
        setSections((prev) => ({
            ...prev,
            [section]: prev[section].filter((x) => x !== id),
        }));

    // ordem na tela = ordem no site
    const reorder = (section: SectionKey, from: number, to: number) =>
        setSections((prev) => {
            const list = [...prev[section]];
            if (
                from === to ||
                from < 0 ||
                from >= list.length ||
                to < 0 ||
                to >= list.length
            )
                return prev;
            const [item] = list.splice(from, 1);
            list.splice(to, 0, item);
            return { ...prev, [section]: list };
        });

    // "Voltar ao automático": limpa a lista curada da seção.
    const clearSection = (section: SectionKey) =>
        setSections((prev) => ({ ...prev, [section]: [] }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/settings/${SETTING_KEY}`, sections);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    return {
        products,
        sections,
        loading,
        saving,
        saved,
        productById,
        addProduct,
        removeProduct,
        reorder,
        clearSection,
        handleSave,
    };
}
