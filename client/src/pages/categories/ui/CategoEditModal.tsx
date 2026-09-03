import type { PropsEdit } from "../types";
import { Save, X } from "lucide-react";

export function CategoryEditModal({
    levelLabel,
    contextLabel,
    values,
    saving,
    error,
    onChange,
    onSave,
    onCancel,
    slugify,
}: PropsEdit) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
                <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{levelLabel}</h2>
                    <button
                        onClick={onCancel}
                        className="p-1 text-gray-400 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>
                {contextLabel && (
                    <p className="mb-4 text-xs text-gray-400">{contextLabel}</p>
                )}

                {error && (
                    <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Nome *
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={values.name}
                            onChange={(e) =>
                                onChange({
                                    name: e.target.value,
                                    slug: slugify(e.target.value),
                                })
                            }
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#8C2F39] focus:outline-none"
                            placeholder="Ex: Tops Fitness"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Slug (URL)
                        </label>
                        <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#8C2F39]">
                            <span className="border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
                                /categoria/
                            </span>
                            <input
                                type="text"
                                value={values.slug}
                                onChange={(e) =>
                                    onChange({
                                        slug: e.target.value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9-]/g, ""),
                                    })
                                }
                                className="flex-1 px-3 py-2.5 font-mono text-sm focus:outline-none"
                                placeholder="tops-fitness"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Descrição
                        </label>
                        <textarea
                            value={values.description || ""}
                            onChange={(e) =>
                                onChange({ description: e.target.value || null })
                            }
                            rows={2}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#8C2F39] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Imagem (URL)
                        </label>
                        <input
                            type="text"
                            value={values.image_url || ""}
                            onChange={(e) => onChange({ image_url: e.target.value || null })}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#8C2F39] focus:outline-none"
                            placeholder="https://..."
                        />
                        {values.image_url && (
                            <div className="relative mt-2 h-16 w-24 overflow-hidden rounded-lg border border-gray-200">
                                <img src={values.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />

                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Ordem de separação (fila do estoque)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={values.pick_order}
                            onChange={(e) =>
                                onChange({ pick_order: Number(e.target.value) || 0 })
                            }
                            className="w-32 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#8C2F39] focus:outline-none"
                            placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Sequência das prateleiras: 1, 2, 3… O romaneio sai nessa ordem. 0 = sem fila (vai pro fim).
                        </p>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={values.active}
                            onChange={(e) => onChange({ active: e.target.checked })}
                            className="h-4 w-4 accent-[#8C2F39]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Categoria ativa
                        </span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onSave}
                            disabled={saving || !values.name}
                            className="flex items-center gap-2 rounded-xl bg-[#8C2F39] px-6 py-2.5 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                        >
                            <Save size={15} /> {saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                            onClick={onCancel}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
