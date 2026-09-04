import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { mapApiProduct } from "../product/mappers";
import type { AdminProduct } from "../product/types";
import { mapApiCategory } from "../categories/mappers";
import type { CategoryRow } from "../categories/types";

// Seções da home do site (client/src/app/page.tsx): Lançamentos, Mais Vendidos e
// Outlet. As chaves batem com o contrato de dados salvo em settings.home_sections.
export const SECTIONS = [
    { key: "lancamentos", label: "Lançamentos" },
    { key: "maisVendidos", label: "Mais Vendidos" },
    { key: "outlet", label: "Outlet" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export type HomeSections = Record<SectionKey, string[]>;
// Categoria de ORIGEM por seção da home: valor = SLUG da categoria; "" = não configurada.
export type HomeSectionCategories = Record<SectionKey, string>;

const SETTING_KEY = "home_sections";
const CATEGORIES_SETTING_KEY = "home_section_categories";
// Quantos produtos aparecem por seção na home.
export const SECTION_LIMIT = 8;

function emptySections(): HomeSections {
    return { lancamentos: [], maisVendidos: [], outlet: [] };
}

// Defaults quando a chave home_section_categories está AUSENTE — MESMA regra do site
// (bannersService.mapHomeSectionCategories): Lançamentos→lancamentos, Outlet→outlet,
// Mais Vendidos→vazio (a cliente escolhe). Evita que salvar zere Lançamentos/Outlet.
const HOME_SECTION_CATEGORIES_DEFAULT: HomeSectionCategories = {
    lancamentos: "lancamentos",
    maisVendidos: "mais-vendidos",
    outlet: "outlet",
};

function defaultSectionCategories(): HomeSectionCategories {
    return { ...HOME_SECTION_CATEGORIES_DEFAULT };
}

export function useVitrineAdmin() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [sections, setSections] = useState<HomeSections>(emptySections());
    const [sectionCategories, setSectionCategories] =
        useState<HomeSectionCategories>(defaultSectionCategories());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [prods, cats, rows] = await Promise.all([
                api.get<Record<string, any>[]>("/api/admin/products"),
                api.get<Record<string, any>[]>("/api/admin/categories"),
                api.get<{ key: string; value: any }[]>("/api/admin/settings"),
            ]);
            setProducts(prods.map(mapApiProduct));
            setCategories(cats.map(mapApiCategory));

            const stored = rows.find((r) => r.key === SETTING_KEY)?.value;
            setSections({
                lancamentos: Array.isArray(stored?.lancamentos) ? stored.lancamentos : [],
                maisVendidos: Array.isArray(stored?.maisVendidos)
                    ? stored.maisVendidos
                    : [],
                outlet: Array.isArray(stored?.outlet) ? stored.outlet : [],
            });

            const storedCats = rows.find((r) => r.key === CATEGORIES_SETTING_KEY)?.value;
            // chave AUSENTE => defaults (site faz igual); PRESENTE => respeita cada campo
            // (vazio = seção oculta, escolha deliberada da cliente).
            setSectionCategories(
                storedCats && typeof storedCats === "object"
                    ? {
                          lancamentos:
                              typeof storedCats.lancamentos === "string"
                                  ? storedCats.lancamentos
                                  : "",
                          maisVendidos:
                              typeof storedCats.maisVendidos === "string"
                                  ? storedCats.maisVendidos
                                  : "",
                          outlet:
                              typeof storedCats.outlet === "string" ? storedCats.outlet : "",
                      }
                    : defaultSectionCategories(),
            );
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

    // Categoria de origem da seção (valor = slug; "" = não configurada).
    const setSectionCategory = (section: SectionKey, slug: string) =>
        setSectionCategories((prev) => ({ ...prev, [section]: slug }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/settings/${SETTING_KEY}`, sections);
            await api.put(
                `/api/admin/settings/${CATEGORIES_SETTING_KEY}`,
                sectionCategories,
            );
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
        categories,
        sections,
        sectionCategories,
        loading,
        saving,
        saved,
        productById,
        addProduct,
        removeProduct,
        reorder,
        clearSection,
        setSectionCategory,
        handleSave,
    };
}
