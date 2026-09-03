import type { useProductsAdmin } from "../useProductsAdmin";
import { effectivePrice, isSuspiciousPrice } from "../domain";
import { BRANDS } from "../types";

import {
    Download,
    Plus,
    Search,
    X,
    List,
    LayoutGrid,
    CheckSquare,
    Square,
    Package,
    ArrowUpDown,
    Edit,
    Eye,
    EyeOff,
    Trash2,
    ExternalLink,
    History,
    AlertTriangle,
} from "lucide-react";

type ProductsVM = ReturnType<typeof useProductsAdmin>;

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "http://localhost:3000";

const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const fmtDay = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
          })
        : "";

export function ProductListView({ vm }: { vm: ProductsVM }) {
    const {
        products,
        categories,
        search,
        setSearch,
        filterCategory,
        setFilterCategory,
        filterStatus,
        setFilterStatus,
        filterBrand,
        setFilterBrand,
        filterStock,
        setFilterStock,
        filterAttribute,
        setFilterAttribute,
        filterSuspicious,
        setFilterSuspicious,
        viewMode,
        setViewMode,
        selected,
        setSelected,
        filtered,
        loading,
        exportCSV,
        openNew,
        bulkActivate,
        bulkDelete,
        selectAll,
        toggleSort,
        toggleSelect,
        openEdit,
        toggleActive,
        toggleVisible,
        openHistory,
        handleDelete,
    } = vm;

    // Opcoes de "Atributos": tamanhos + cores distintos dos produtos carregados.
    const attributeOptions = [
        ...new Set(
            products.flatMap((p) => [...(p.sizes || []), ...(p.colors || [])]),
        ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    const hasFilters =
        search ||
        filterCategory ||
        filterStatus ||
        filterBrand ||
        filterStock ||
        filterAttribute ||
        filterSuspicious;

    const clearFilters = () => {
        setSearch("");
        setFilterCategory("");
        setFilterStatus("");
        setFilterBrand("");
        setFilterStock("");
        setFilterAttribute("");
        setFilterSuspicious(false);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
                    <p className="mt-1 text-gray-500">
                        {products.length} produtos cadastrados
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                        <Download size={15} /> CSV
                    </button>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-2.5 font-semibold text-white hover:bg-[#7a2832]"
                    >
                        <Plus size={18} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="relative min-w-48 flex-1">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, código ou referência..."
                        className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-[#8C2F39] focus:outline-none"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) =>
                        setFilterStatus(e.target.value as "" | "active" | "inactive")
                    }
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 focus:border-[#8C2F39] focus:outline-none"
                >
                    <option value="">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                </select>
                <select
                    value={filterStock}
                    onChange={(e) =>
                        setFilterStock(e.target.value as "" | "in" | "out")
                    }
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 focus:border-[#8C2F39] focus:outline-none"
                >
                    <option value="">Todo o estoque</option>
                    <option value="in">Em estoque</option>
                    <option value="out">Esgotado</option>
                </select>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 focus:border-[#8C2F39] focus:outline-none"
                >
                    <option value="">Todas as categorias</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 focus:border-[#8C2F39] focus:outline-none"
                >
                    <option value="">Todas as marcas</option>
                    {BRANDS.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>
                <select
                    value={filterAttribute}
                    onChange={(e) => setFilterAttribute(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 focus:border-[#8C2F39] focus:outline-none"
                >
                    <option value="">Todos os atributos</option>
                    {attributeOptions.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setFilterSuspicious(!filterSuspicious)}
                    title="Lista produtos com preço ≤ 0 ou suspeitosamente baixo (pente-fino)"
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${filterSuspicious
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                >
                    <AlertTriangle size={14} /> Preço suspeito
                </button>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-2 text-sm text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} /> Limpar
                    </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                        {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
                    </span>
                    {/* View toggle */}
                    <div className="flex overflow-hidden rounded-lg border border-gray-200">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 ${viewMode === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                        >
                            <List size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 ${viewMode === "grid" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                        >
                            <LayoutGrid size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="mb-4 flex items-center gap-4 rounded-xl bg-gray-900 px-5 py-3 text-white">
                    <span className="text-sm font-medium">
                        {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => bulkActivate(true)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs hover:bg-green-700"
                        >
                            Ativar
                        </button>
                        <button
                            onClick={() => bulkActivate(false)}
                            className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs hover:bg-yellow-700"
                        >
                            Desativar
                        </button>
                        <button
                            onClick={bulkDelete}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs hover:bg-red-700"
                        >
                            Excluir
                        </button>
                        <button
                            onClick={() => setSelected(new Set())}
                            className="ml-1 px-2 text-xs text-gray-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-16 text-center text-gray-400 shadow-sm">
                    <Package size={56} className="mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhum produto encontrado</p>
                </div>
            ) : viewMode === "list" ? (
                /* ── TABLE VIEW ── */
                <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-xs text-gray-500">
                                <th className="w-10 px-4 py-3">
                                    <button onClick={selectAll}>
                                        {selected.size === filtered.length &&
                                            filtered.length > 0 ? (
                                            <CheckSquare size={16} className="text-[#8C2F39]" />
                                        ) : (
                                            <Square size={16} className="text-gray-400" />
                                        )}
                                    </button>
                                </th>
                                <th
                                    className="hidden cursor-pointer px-3 py-3 text-left hover:text-gray-700 md:table-cell"
                                    onClick={() => toggleSort("code")}
                                >
                                    <span className="flex items-center gap-1">
                                        Código <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th className="w-12 px-3 py-3 text-left">Foto</th>
                                <th
                                    className="cursor-pointer px-3 py-3 text-left hover:text-gray-700"
                                    onClick={() => toggleSort("name")}
                                >
                                    <span className="flex items-center gap-1">
                                        Produto <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th className="hidden px-3 py-3 text-left lg:table-cell">
                                    Categoria
                                </th>
                                <th
                                    className="cursor-pointer px-3 py-3 text-right hover:text-gray-700"
                                    onClick={() => toggleSort("base_price")}
                                >
                                    <span className="flex items-center justify-end gap-1">
                                        Preço <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th
                                    className="cursor-pointer px-3 py-3 text-right hover:text-gray-700"
                                    onClick={() => toggleSort("stock_sum")}
                                >
                                    <span className="flex items-center justify-end gap-1">
                                        Estoque <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th
                                    className="hidden cursor-pointer px-3 py-3 text-right hover:text-gray-700 lg:table-cell"
                                    onClick={() => toggleSort("sales_count")}
                                >
                                    <span className="flex items-center justify-end gap-1">
                                        Vendas <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th className="hidden px-3 py-3 text-left xl:table-cell">
                                    Peso e dimensões
                                </th>
                                <th className="px-3 py-3 text-center">Status</th>
                                <th className="px-3 py-3 text-center">Exibir na loja</th>
                                <th className="px-3 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((product) => {
                                const imgs = Array.isArray(product.images)
                                    ? product.images
                                    : [];
                                const catName = categories.find(
                                    (c) => c.id === product.category_id,
                                )?.name;
                                const isSelected = selected.has(product.id);
                                const hasPromo =
                                    product.sale_price != null &&
                                    product.sale_price > 0 &&
                                    product.sale_price < product.base_price;
                                const pct = hasPromo
                                    ? Math.round(
                                        (1 - product.sale_price! / product.base_price) * 100,
                                    )
                                    : 0;
                                const suspicious = isSuspiciousPrice(product);
                                const period = [
                                    fmtDay(product.sale_start),
                                    fmtDay(product.sale_end),
                                ]
                                    .filter(Boolean)
                                    .join(" – ");
                                return (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50 ${isSelected ? "bg-rose-50" : ""}`}
                                    >
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleSelect(product.id)}>
                                                {isSelected ? (
                                                    <CheckSquare size={16} className="text-[#8C2F39]" />
                                                ) : (
                                                    <Square size={16} className="text-gray-300" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="hidden px-3 py-3 md:table-cell">
                                            <p className="font-mono text-xs text-gray-600">
                                                {product.code || "—"}
                                            </p>
                                            {product.reference && (
                                                <p className="text-[11px] text-gray-400">
                                                    Ref. {product.reference}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                {imgs[0] ? (
                                                    <img
                                                        src={imgs[0]}
                                                        alt={product.name}
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Package
                                                        size={16}
                                                        className="absolute inset-0 m-auto text-gray-300"
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <p className="line-clamp-1 font-medium text-gray-900">
                                                    {product.name}
                                                </p>
                                                <a
                                                    href={`${SITE_URL}/produto/${product.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Abrir na vitrine"
                                                    className="shrink-0 text-gray-300 hover:text-[#8C2F39]"
                                                >
                                                    <ExternalLink size={13} />
                                                </a>
                                            </div>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                                {product.variation_count > 0 && (
                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                                        {product.variation_count} variaç
                                                        {product.variation_count > 1 ? "ões" : "ão"}
                                                    </span>
                                                )}
                                                {product.is_new && (
                                                    <span className="rounded bg-[#8C2F39] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                        NOVO
                                                    </span>
                                                )}
                                                {product.featured && (
                                                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                        DESTAQUE
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="hidden px-3 py-3 text-xs text-gray-500 lg:table-cell">
                                            {catName || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {hasPromo ? (
                                                <>
                                                    <p className="text-xs text-gray-400 line-through">
                                                        R$ {fmtBRL(product.base_price)}
                                                    </p>
                                                    <p className="font-semibold text-gray-900">
                                                        R$ {fmtBRL(product.sale_price!)}
                                                        <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-[10px] font-semibold text-green-700">
                                                            -{pct}%
                                                        </span>
                                                    </p>
                                                    {period && (
                                                        <p className="text-[10px] text-gray-400">{period}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <p
                                                    className={`font-semibold ${suspicious ? "text-amber-600" : "text-gray-900"}`}
                                                >
                                                    R$ {fmtBRL(product.base_price)}
                                                </p>
                                            )}
                                            {suspicious && (
                                                <span
                                                    className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-amber-600"
                                                    title="Preço ≤ 0 ou suspeitosamente baixo"
                                                >
                                                    <AlertTriangle size={10} /> suspeito
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right text-gray-700">
                                            <span
                                                className={
                                                    product.stock_sum === 0
                                                        ? "font-medium text-red-500"
                                                        : ""
                                                }
                                            >
                                                {product.stock_sum}
                                            </span>
                                        </td>
                                        <td className="hidden px-3 py-3 text-right text-gray-500 lg:table-cell">
                                            {product.sales_count ?? "—"}
                                        </td>
                                        <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-gray-500 xl:table-cell">
                                            {product.weight_kg != null
                                                ? `${Math.round(product.weight_kg * 1000)}g`
                                                : "—"}{" "}
                                            · A:{product.pkg_height_cm ?? "—"} · L:
                                            {product.pkg_width_cm ?? "—"} · C:
                                            {product.pkg_length_cm ?? "—"}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => toggleActive(product)}
                                                title="Alternar status (Ativo/Inativo)"
                                                className={`rounded-full px-2 py-1 text-xs font-medium ${product.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                            >
                                                {product.active ? "Ativo" : "Inativo"}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => toggleVisible(product)}
                                                title="Exibir na loja (Sim/Não)"
                                                className={`rounded-full px-2 py-1 text-xs font-medium ${product.visible_in_store ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                            >
                                                {product.visible_in_store ? "Sim" : "Não"}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openEdit(product)}
                                                    className="rounded-lg p-1.5 hover:bg-gray-100"
                                                    title="Editar"
                                                >
                                                    <Edit size={14} className="text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="rounded-lg p-1.5 hover:bg-red-50"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                                <button
                                                    onClick={() => openHistory(product)}
                                                    className="rounded-lg p-1.5 hover:bg-gray-100"
                                                    title="Histórico"
                                                >
                                                    <History size={14} className="text-gray-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* ── GRID VIEW ── */
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((product) => {
                        const imgs = Array.isArray(product.images) ? product.images : [];
                        const isSelected = selected.has(product.id);
                        return (
                            <div
                                key={product.id}
                                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isSelected ? "ring-2 ring-[#8C2F39]" : ""} ${product.active ? "border-gray-100" : "border-gray-200 opacity-60"}`}
                            >
                                <div className="relative aspect-[3/4] bg-gray-100">
                                    <button
                                        onClick={() => toggleSelect(product.id)}
                                        className="absolute right-2 top-2 z-10 rounded-lg bg-white/80 p-1"
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={16} className="text-[#8C2F39]" />
                                        ) : (
                                            <Square size={16} className="text-gray-400" />
                                        )}
                                    </button>
                                    {imgs[0] ? (
                                        <img
                                            src={imgs[0]}
                                            alt={product.name}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package size={40} className="text-gray-300" />
                                        </div>
                                    )}
                                    {!product.active && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                            <EyeOff size={24} className="text-gray-500" />
                                        </div>
                                    )}
                                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                                        {product.is_new && (
                                            <span className="rounded bg-[#8C2F39] px-2 py-0.5 text-xs font-semibold text-white">
                                                NOVO
                                            </span>
                                        )}
                                        {product.featured && (
                                            <span className="rounded bg-[#D4A956] px-2 py-0.5 text-xs font-semibold text-white">
                                                DESTAQUE
                                            </span>
                                        )}
                                    </div>
                                    {product.sizes?.length > 0 && (
                                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                                            {product.sizes.slice(0, 4).map((s) => (
                                                <span
                                                    key={s}
                                                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    {product.code && (
                                        <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                                            {product.code}
                                        </p>
                                    )}
                                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold">
                                        {product.name}
                                    </h3>
                                    {product.colors?.length > 0 && (
                                        <p className="mb-1 text-xs text-gray-400">
                                            {product.colors.length} cor
                                            {product.colors.length > 1 ? "es" : ""}
                                        </p>
                                    )}
                                    <p className="text-base font-bold text-[#8C2F39]">
                                        R${" "}
                                        {product.base_price.toLocaleString("pt-BR", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PIX: R${" "}
                                        {(
                                            product.pix_price ?? product.base_price * 0.95
                                        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => openEdit(product)}
                                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-gray-700"
                                        >
                                            <Edit size={14} /> Editar
                                        </button>
                                        <button
                                            onClick={() => toggleActive(product)}
                                            className="rounded-lg border p-2 hover:bg-gray-50"
                                        >
                                            {product.active ? (
                                                <Eye size={14} className="text-green-600" />
                                            ) : (
                                                <EyeOff size={14} className="text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="rounded-lg border border-red-200 p-2 hover:bg-red-50"
                                        >
                                            <Trash2 size={14} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
