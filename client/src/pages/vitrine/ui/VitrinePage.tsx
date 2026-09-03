import { useMemo, useState } from "react";
import { AlertTriangle, GripVertical, Plus, RefreshCw, RotateCcw, Save, Search, X } from "lucide-react";
import {
    SECTION_LIMIT,
    SECTIONS,
    useVitrineAdmin,
    type SectionKey,
} from "../useVitrineAdmin";
import type { AdminProduct } from "../../product/types";

function Thumb({ product }: { product?: AdminProduct }) {
    const src = product?.images?.[0];
    if (!src) {
        return (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] text-gray-400">
                sem foto
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={product?.name ?? ""}
            className="h-14 w-14 shrink-0 rounded object-cover"
        />
    );
}

export function VitrinePage() {
    const vm = useVitrineAdmin();
    const [tab, setTab] = useState<SectionKey>("lancamentos");
    const [query, setQuery] = useState("");
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const curated = vm.sections[tab];
    const full = curated.length >= SECTION_LIMIT;

    // Busca por NOME ou CÓDIGO, ignorando os que já estão na seção.
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return vm.products
            .filter(
                (p) =>
                    !curated.includes(p.id) &&
                    ((p.name ?? "").toLowerCase().includes(q) ||
                        (p.code ?? "").toLowerCase().includes(q)),
            )
            .slice(0, 8);
    }, [query, vm.products, curated]);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vitrine</h1>
                    <p className="mt-1 text-gray-500">
                        Escolha quais produtos aparecem em cada seção da home. Seção vazia
                        = automático.
                    </p>
                </div>

                <button
                    onClick={vm.handleSave}
                    disabled={vm.saving}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                >
                    {vm.saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {vm.saving ? "Salvando..." : vm.saved ? "Salvo!" : "Salvar"}
                </button>
            </div>

            <div className="mb-6 flex gap-2 border-b border-gray-200">
                {SECTIONS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => {
                            setTab(s.key);
                            setQuery("");
                        }}
                        className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === s.key
                            ? "border-[#8C2F39] text-[#8C2F39]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {s.label}
                        {vm.sections[s.key].length > 0 && (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {vm.sections[s.key].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {vm.loading ? (
                <p className="text-gray-500">Carregando...</p>
            ) : (
                <div className="max-w-3xl">
                    {/* Busca + adicionar */}
                    <div className="mb-2 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar produto por nome ou código..."
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-[#8C2F39] focus:outline-none"
                            />
                        </div>
                        <span className="whitespace-nowrap text-sm text-gray-500">
                            {curated.length}/{SECTION_LIMIT}
                        </span>
                    </div>

                    {full && (
                        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            Limite de {SECTION_LIMIT} produtos atingido. Remova algum para
                            adicionar outro.
                        </p>
                    )}

                    {results.length > 0 && (
                        <div className="mb-6 divide-y rounded-lg border border-gray-200">
                            {results.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3">
                                    <Thumb product={p} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900">
                                            {p.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{p.code ?? "—"}</p>
                                    </div>
                                    <button
                                        onClick={() => vm.addProduct(tab, p.id)}
                                        disabled={full}
                                        className="flex items-center gap-1 rounded-lg bg-[#8C2F39] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a2832] disabled:opacity-40"
                                    >
                                        <Plus size={14} />
                                        Adicionar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Lista curada */}
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Produtos escolhidos ({curated.length})
                        </h2>
                        {curated.length > 0 && (
                            <button
                                onClick={() => vm.clearSection(tab)}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8C2F39]"
                            >
                                <RotateCcw size={14} />
                                Voltar ao automático
                            </button>
                        )}
                    </div>

                    {curated.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                            Nenhum produto escolhido — esta seção usa o modo automático.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {curated.map((id, index) => {
                                const product = vm.productById(id);
                                const noPhoto = !product || (product.images?.length ?? 0) === 0;
                                const inactive = !!product && !product.active;
                                return (
                                    <li
                                        key={id}
                                        draggable
                                        onDragStart={() => setDragIndex(index)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (dragIndex !== null) vm.reorder(tab, dragIndex, index);
                                            setDragIndex(null);
                                        }}
                                        onDragEnd={() => setDragIndex(null)}
                                        className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${dragIndex === index
                                            ? "border-[#8C2F39] opacity-60"
                                            : "border-gray-200"
                                            }`}
                                    >
                                        <GripVertical
                                            size={18}
                                            className="shrink-0 cursor-grab text-gray-400"
                                        />
                                        <Thumb product={product} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900">
                                                {product ? product.name : "Produto não encontrado"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {product?.code ?? id}
                                            </p>
                                            {(noPhoto || inactive || !product) && (
                                                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                                                    <AlertTriangle size={12} />
                                                    {!product
                                                        ? "produto não encontrado"
                                                        : [
                                                            noPhoto ? "sem foto" : null,
                                                            inactive ? "inativo" : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    {" — não aparece no site"}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => vm.removeProduct(tab, id)}
                                            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                            aria-label="Remover"
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
