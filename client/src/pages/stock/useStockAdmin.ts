import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { StockProduct, StockSku } from "./types";

export function useStockAdmin() {
    const [products, setProducts] = useState<StockProduct[]>([]);
    const [selected, setSelected] = useState<StockProduct | null>(null);
    const [skus, setSkus] = useState<StockSku[]>([]);
    const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingSkus, setLoadingSkus] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const [prods, cats, colors] = await Promise.all([
                    api.get<Record<string, any>[]>("/api/admin/products"),
                    api.get<Record<string, any>[]>("/api/admin/categories"),
                    api.get<Record<string, any>[]>("/api/admin/colors"),
                ]);
                const catNameById = new Map(cats.map((c) => [c.id, c.name]));
                setColorNameById(new Map(colors.map((c) => [c.id, c.name])));
                setProducts(
                    prods
                        .filter((p) => p.active)
                        .map((p) => ({
                            id: p.id,
                            name: p.name,
                            code: p.code,
                            category: p.categoryId ? (catNameById.get(p.categoryId) ?? "") : "",
                        })),
                );
            } catch (err) {
                console.error("Erro ao carregar produtos:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const [colorNameById, setColorNameById] = useState<Map<string, string>>(
        new Map(),
    );

    const loadSkus = async (productId: string) => {
        setLoadingSkus(true);
        try {
            const rows = await api.get<Record<string, any>[]>(
                `/api/admin/products/${productId}/skus`,
            );
            const mapped: StockSku[] = rows
                .map((s) => ({
                    id: s.id,
                    size: s.size,
                    color: s.colorId ? (colorNameById.get(s.colorId) ?? "?") : null,
                    code: s.code,
                    stock_qty: s.stockQty ?? 0,
                    reserved_qty: s.reservedQty ?? 0,
                }))
                .sort(
                    (a, b) =>
                        a.size.localeCompare(b.size) ||
                        (a.color ?? "").localeCompare(b.color ?? ""),
                );
            setSkus(mapped);
            setDirtyIds(new Set());
        } catch (err) {
            console.error("Erro ao carregar SKUs:", err);
        } finally {
            setLoadingSkus(false);
        }
    };

    const selectProduct = async (p: StockProduct) => {
        setSelected(p);
        await loadSkus(p.id);
    };

    const updateQty = (skuId: string, value: number) => {
        setSkus((prev) =>
            prev.map((s) =>
                s.id === skuId ? { ...s, stock_qty: Math.max(0, value) } : s,
            ),
        );
        setDirtyIds((prev) => new Set(prev).add(skuId));
    };

    const save = async () => {
        if (!selected || dirtyIds.size === 0) return;
        setSaving(true);
        try {
            for (const sku of skus) {
                if (!dirtyIds.has(sku.id)) continue;
                await api.put(
                    `/api/admin/products/${selected.id}/skus/${sku.id}`,
                    { stockQty: sku.stock_qty },
                );
            }
            await loadSkus(selected.id);
            setToast("Estoque salvo!");
            setTimeout(() => setToast(""), 2500);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar estoque");
        } finally {
            setSaving(false);
        }
    };

    return {
        products,
        selected,
        skus,
        dirtyIds,
        loading,
        loadingSkus,
        saving,
        search,
        setSearch,
        toast,
        selectProduct,
        loadSkus,
        updateQty,
        save,
    };
}
