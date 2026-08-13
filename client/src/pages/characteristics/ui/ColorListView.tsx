import type { useColorsAdmin } from "../useColorsAdmin";
import { Edit, Palette, Plus, Trash2 } from "lucide-react";

export function ColorListView({
    vm,
}: {
    vm: ReturnType<typeof useColorsAdmin>;
}) {
    const { colors, loading, openNew, openEdit, handleDelete } = vm;

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Características</h1>
                    <p className="mt-1 text-gray-500">Cores usadas nos produtos</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832]"
                >
                    <Plus size={18} />
                    Nova Cor
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
                </div>
            ) : colors.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-16 text-center text-gray-400 shadow-sm">
                    <Palette size={56} className="mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhuma cor cadastrada</p>
                    <p className="mt-1 text-sm">
                        Cadastre as cores que serão usadas nos produtos
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {colors.map((color) => (
                        <div
                            key={color.id}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                        >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border">
                                <img
                                    src={color.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                {color.name}
                            </p>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    onClick={() => openEdit(color)}
                                    className="rounded-lg p-1.5 hover:bg-gray-100"
                                >
                                    <Edit size={14} className="text-gray-600" />
                                </button>
                                <button
                                    onClick={() => handleDelete(color.id)}
                                    className="rounded-lg p-1.5 hover:bg-red-50"
                                >
                                    <Trash2 size={14} className="text-red-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
