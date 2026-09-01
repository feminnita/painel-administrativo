import type { useColorsAdmin } from "../useColorsAdmin";
import { Edit, ImageOff, Palette, Plus, Search, Trash2 } from "lucide-react";

export function ColorListView({
    vm,
}: {
    vm: ReturnType<typeof useColorsAdmin>;
}) {
    const {
        colors,
        filtered,
        visible,
        hasMore,
        showMore,
        missingImageCount,
        search,
        setSearch,
        onlyMissingImage,
        setOnlyMissingImage,
        loading,
        openNew,
        openEdit,
        handleDelete,
    } = vm;

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Características</h1>
                    <p className="mt-1 text-gray-500">
                        {colors.length} cor(es) cadastrada(s)
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832]"
                >
                    <Plus size={18} />
                    Nova Cor
                </button>
            </div>

            {/* busca + filtro */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                    <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-[#8C2F39] focus:outline-none"
                        placeholder="Buscar cor pelo nome"
                    />
                </div>
                {missingImageCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setOnlyMissingImage(!onlyMissingImage)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${onlyMissingImage
                            ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                            : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                    >
                        <ImageOff size={13} />
                        {missingImageCount} sem imagem
                    </button>
                )}
                {(search || onlyMissingImage) && (
                    <span className="text-xs text-gray-400">
                        {filtered.length} resultado(s)
                    </span>
                )}
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
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-gray-400">
                    Nenhuma cor encontrada com esses filtros.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {visible.map((color) => (
                            <div
                                key={color.id}
                                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gray-100">
                                    {color.image_url ? (
                                        <img
                                            src={color.image_url}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImageOff size={14} className="text-gray-300" />
                                    )}
                                </div>
                                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {color.name}
                                </p>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        onClick={() => openEdit(color)}
                                        className="rounded-lg p-1.5 hover:bg-gray-100"
                                        aria-label={`Editar ${color.name}`}
                                    >
                                        <Edit size={14} className="text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(color.id)}
                                        className="rounded-lg p-1.5 hover:bg-red-50"
                                        aria-label={`Excluir ${color.name}`}
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={showMore}
                                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Carregar mais ({filtered.length - visible.length} restantes)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
