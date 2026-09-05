import { api, ApiError } from "@/lib/api/client";
import { parseDecimal } from "@/lib/parseDecimal";
import {
    DollarSign,
    Edit,
    Percent,
    Plus,
    Save,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { mapApiCoupon, toApiCoupon } from "../mappers";
import type { Coupon } from "../types";

const emptyCoupon = (): Omit<Coupon, "id" | "used_count"> => ({
    code: "",
    type: "percentage",
    value: 10,
    min_order_value: 0,
    max_uses: null,
    active: true,
    expires_at: null,
});

export function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [editing, setEditing] = useState<
        (Omit<Coupon, "id" | "used_count"> & { id?: string }) | null
    >(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api.get<Record<string, any>[]>("/api/admin/coupons");
            setCoupons(data.map(mapApiCoupon));
        } catch (err) {
            console.error("Erro ao carregar cupons:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async () => {
        if (!editing || !editing.code) return;
        setSaving(true);
        try {
            const payload = toApiCoupon({
                ...editing,
                code: editing.code.toUpperCase().trim(),
                max_uses: editing.max_uses || null,
                expires_at: editing.expires_at || null,
            });

            if (editing.id) {
                await api.put(`/api/admin/coupons/${editing.id}`, payload);
            } else {
                await api.post("/api/admin/coupons", payload);
            }
            setEditing(null);
            load();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao salvar cupom");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este cupom?")) return;
        try {
            await api.delete(`/api/admin/coupons/${id}`);
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao excluir");
        }
        load();
    };

    const toggleActive = async (coupon: Coupon) => {
        try {
            await api.put(`/api/admin/coupons/${coupon.id}`, { active: !coupon.active });
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Erro ao atualizar");
        }
        load();
    };

    const isExpired = (c: Coupon) =>
        c.expires_at && new Date(c.expires_at) < new Date();

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Cupons de Desconto
                    </h1>
                    <p className="mt-1 text-gray-500">
                        {coupons.length} cupons cadastrados
                    </p>
                </div>
                <button
                    onClick={() => setEditing(emptyCoupon())}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832]"
                >
                    <Plus size={18} />
                    Novo Cupom
                </button>
            </div>

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-7 shadow-xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {editing.id ? "Editar" : "Novo"} Cupom
                            </h2>
                            <button onClick={() => setEditing(null)}>
                                <X size={22} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Código do cupom *
                                </label>
                                <input
                                    type="text"
                                    value={editing.code}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    className="w-full rounded-lg border px-4 py-2 font-mono uppercase focus:ring-2 focus:ring-[#8C2F39]"
                                    placeholder="FEMINNITA10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Tipo de desconto
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditing({ ...editing, type: "percentage" })
                                            }
                                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm ${editing.type === "percentage"
                                                    ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                                                    : "border-gray-200"
                                                }`}
                                        >
                                            <Percent size={14} /> Porcentagem
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditing({ ...editing, type: "fixed" })}
                                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm ${editing.type === "fixed"
                                                    ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                                                    : "border-gray-200"
                                                }`}
                                        >
                                            <DollarSign size={14}/>Fixo
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Valor ({editing.type === "percentage" ? "%" : "R$"})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step={editing.type === "percentage" ? "1" : "0.01"}
                                        max={editing.type === "percentage" ? "100" : undefined}
                                        value={editing.value}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                value: parseDecimal(e.target.value) ?? 0,
                                            })
                                        }
                                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Pedido mínimo (R$)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editing.min_order_value}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                min_order_value: parseDecimal(e.target.value) ?? 0,
                                            })
                                        }
                                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Máx. de usos
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editing.max_uses || ""}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                max_uses: Number.parseInt(e.target.value) || null,
                                            })
                                        }
                                        className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                                        placeholder="Ilimitado"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Data de expiração
                                </label>
                                <input
                                    type="datetime-local"
                                    value={
                                        editing.expires_at ? editing.expires_at.slice(0, 16) : ""
                                    }
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            expires_at: e.target.value
                                                ? new Date(e.target.value).toISOString()
                                                : null,
                                        })
                                    }
                                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                                />
                            </div>

                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editing.active}
                                    onChange={(e) =>
                                        setEditing({ ...editing, active: e.target.checked })
                                    }
                                    className="h-4 w-4 accent-[#8C2F39]"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Cupom ativo
                                </span>
                            </label>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editing.code}
                                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {saving ? "Salvando..." : "Salvar"}
                                </button>
                                <button
                                    onClick={() => setEditing(null)}
                                    className="rounded-lg border px-5 py-2 text-sm hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
                </div>
            ) : coupons.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-16 text-center text-gray-400 shadow-sm">
                    <Tag size={56} className="mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhum cupom cadastrado</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                    <table className="w-full">
                        <thead className="border-b bg-gray-50">
                            <tr>
                                {[
                                    "Código",
                                    "Tipo",
                                    "Valor",
                                    "Usos",
                                    "Validade",
                                    "Status",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {coupons.map((c) => (
                                <tr
                                    key={c.id}
                                    className={`hover:bg-gray-50 ${isExpired(c) ? "opacity-50" : ""}`}
                                >
                                    <td className="px-5 py-4">
                                        <span className="rounded bg-gray-100 px-2 py-1 font-mono font-bold text-gray-900">
                                            {c.code}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm">
                                        {c.type === "percentage"
                                            ? `${c.value}% off`
                                            : `R$ ${c.value.toFixed(2).replace(".", ",")} off`}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {c.min_order_value > 0
                                            ? `Mín. R$ ${c.min_order_value.toFixed(2).replace(".", ",")}`
                                            : "Sem mínimo"}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {c.used_count}
                                        {c.max_uses ? `/${c.max_uses}` : ""}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {c.expires_at
                                            ? new Date(c.expires_at).toLocaleDateString("pt-BR")
                                            : "Sem prazo"}
                                        {isExpired(c) && (
                                            <span className="ml-1 text-xs text-red-500">
                                                (expirado)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => toggleActive(c)}>
                                            <span
                                                className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${c.active && !isExpired(c)
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-500"
                                                    }`}
                                            >
                                                {c.active && !isExpired(c) ? "Ativo" : "Inativo"}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditing({ ...c })}
                                                className="rounded-lg p-2 hover:bg-gray-100"
                                            >
                                                <Edit size={15} className="text-gray-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="rounded-lg p-2 hover:bg-red-50"
                                            >
                                                <Trash2 size={15} className="text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
} 