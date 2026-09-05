import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { mapApiCategory } from "../categories/mappers";
import type { CategoryRow } from "../categories/types";

// Seções da home do site (client/src/app/page.tsx): Lançamentos, Mais Vendidos e
// Outlet. Cada seção tem uma CATEGORIA DE ORIGEM (settings.home_section_categories).
export const SECTIONS = [
    { key: "lancamentos", label: "Lançamentos" },
    { key: "maisVendidos", label: "Mais Vendidos" },
    { key: "outlet", label: "Outlet" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
// Categoria de ORIGEM por seção da home: valor = SLUG da categoria; "" = não configurada.
export type HomeSectionCategories = Record<SectionKey, string>;

const CATEGORIES_SETTING_KEY = "home_section_categories";

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
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [sectionCategories, setSectionCategories] =
        useState<HomeSectionCategories>(defaultSectionCategories());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cats, rows] = await Promise.all([
                api.get<Record<string, any>[]>("/api/admin/categories"),
                api.get<{ key: string; value: any }[]>("/api/admin/settings"),
            ]);
            setCategories(cats.map(mapApiCategory));

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

    // Categoria de origem da seção (valor = slug; "" = não configurada).
    const setSectionCategory = (section: SectionKey, slug: string) =>
        setSectionCategories((prev) => ({ ...prev, [section]: slug }));

    const handleSave = async () => {
        setSaving(true);
        try {
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
        categories,
        sectionCategories,
        loading,
        saving,
        saved,
        setSectionCategory,
        handleSave,
    };
}
