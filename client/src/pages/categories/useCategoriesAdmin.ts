import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { buildTree, canAttachTo, canDelete, levelOf } from "@/lib/categories";
import { mapApiCategory, toApiCategory } from "./mappers";
import type { CategoryInput, CategoryRow, EditingState } from "./types";

const emptyValues = (): CategoryInput => ({
    name: "",
    slug: "",
    description: "",
    image_url: null,
    parent_id: null,
    active: true,
    order_index: 0,
    pick_order: 0,
});

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

export function useCategoriesAdmin() {
    const [rows, setRows] = useState<CategoryRow[]>([]);
    const [productCounts, setProductCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [editing, setEditing] = useState<EditingState | null>(null);

    const load = useCallback(async () => {
        try {
            const [allRows, counts] = await Promise.all([
                api.get<Record<string, any>[]>("/api/admin/categories"),
                api.get<Record<string, number>>("/api/admin/categories/product-counts"),
            ]);
            setRows(allRows.map(mapApiCategory));
            setProductCounts(counts);
        } catch (err) {
            console.error("Erro ao carregar categorias:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const tree = useMemo(() => buildTree(rows), [rows]);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const nextOrderIndex = (parentId: string | null): number => {
        const siblings = rows.filter((r) => r.parent_id === parentId);
        return siblings.length
            ? Math.max(...siblings.map((r) => r.order_index)) + 1
            : 0;
    };

    const openCreate = (level: 1 | 2 | 3, parentId: string | null) => {
        setError(null);
        const parentName = parentId
            ? rows.find((r) => r.id === parentId)?.name
            : undefined;
        setEditing({
            level,
            parentId,
            parentName,
            values: {
                ...emptyValues(),
                parent_id: parentId,
                order_index: nextOrderIndex(parentId),
            },
        });
    };

    const openEdit = (row: CategoryRow) => {
        setError(null);
        const level = levelOf(rows, row.id) ?? 1;
        const parentName = row.parent_id
            ? rows.find((r) => r.id === row.parent_id)?.name
            : undefined;
        setEditing({
            id: row.id,
            level: level as 1 | 2 | 3,
            parentId: row.parent_id,
            parentName,
            values: {
                name: row.name,
                slug: row.slug,
                description: row.description,
                image_url: row.image_url,
                parent_id: row.parent_id,
                active: row.active,
                order_index: row.order_index,
                pick_order: row.pick_order,
            },
        });
    };

    const closeEditing = () => {
        setEditing(null);
        setError(null);
    };

    const updateEditingValues = (values: Partial<CategoryInput>) => {
        setEditing((prev) =>
            prev ? { ...prev, values: { ...prev.values, ...values } } : prev,
        );
    };

    const save = async () => {
        if (!editing || !editing.values.name) return;

        const check = canAttachTo(rows, editing.id ?? null, editing.parentId);
        if (!check.ok) {
            setError(check.reason);
            return;
        }

        setSaving(true);
        try {
            const payload = toApiCategory({
                ...editing.values,
                slug: editing.values.slug || slugify(editing.values.name),
                parent_id: editing.parentId,
            });

            if (editing.id) {
                await api.put(`/api/admin/categories/${editing.id}`, payload);
            } else {
                await api.post("/api/admin/categories", payload);
            }
            closeEditing();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Erro ao salvar categoria");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        const check = canDelete(rows, id, productCounts);
        if (!check.ok) {
            setError(check.reason);
            return;
        }
        if (!confirm("Excluir esta categoria?")) return;
        try {
            await api.delete(`/api/admin/categories/${id}`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Erro ao excluir");
        }
        await load();
    };

    const toggleActive = async (row: CategoryRow) => {
        try {
            await api.put(`/api/admin/categories/${row.id}`, { active: !row.active });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Erro ao atualizar");
        }
        await load();
    };

    const reorder = async (_parentId: string | null, orderedIds: string[]) => {
        const updates = orderedIds.map((id, index) => ({ id, orderIndex: index }));
        setRows((prev) =>
            prev.map((r) => {
                const found = updates.find((u) => u.id === r.id);
                return found ? { ...r, order_index: found.orderIndex } : r;
            }),
        );
        try {
            await api.put("/api/admin/categories/reorder", { updates });
        } catch {
            await load();
        }
    };

    return {
        loading,
        saving,
        error,
        setError,
        productCounts,
        tree,
        expandedIds,
        toggleExpand,
        editing,
        openCreate,
        openEdit,
        closeEditing,
        updateEditingValues,
        save,
        remove,
        toggleActive,
        reorder,
        slugify,
    };
}
