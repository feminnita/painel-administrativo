import { useState } from "react";
import {
    ChevronLeft,
    Tag,
    Weight,
    Ruler,
    Palette,
    Upload,
    Globe,
    Save,
    Eye,
    Star,
    Sparkles,
    TrendingUp,
    Images,
    Hash,
    Package,
    CircleDollarSign,
    Search,
    X,
    Plus,
} from "lucide-react";
import { slugify } from "../domain";
import type { useProductsAdmin } from "../useProductsAdmin";

const DEFAULT_SIZES = ["P", "M", "G", "GG", "48", "50", "52"];

const MEASURE_KEYS = ["busto", "cintura", "quadril"];

const COLOR_LIST_LIMIT = 30;

type ProductsVM = ReturnType<typeof useProductsAdmin>;

type PickerKind = "cor" | "tamanho" | null;

function ToggleSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#8C2F39]" : "bg-gray-300"
                }`}
        >
            <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"
                    }`}
            />
        </button>
    );
}

export function ProductForm({ vm }: { vm: ProductsVM }) {
    const {
        editing,
        setEditing,
        saving,
        handleSave,
        categoryTree,
        selectedCategoryPaiId,
        setSelectedCategoryPaiId,
        selectedCategoryFilhoId,
        setSelectedCategoryFilhoId,
        productColors,
        imagesInput,
        setImagesInput,
        uploading,
        uploadImages,
        getSizes,
        getSkuStock,
        setSkuStock,
        toggleSize,
        toggleColor,
        getColorImages,
        uploadColorImages,
        removeColorImage,
    } = vm;

    const [picker, setPicker] = useState<PickerKind>(null);
    const [pickerSearch, setPickerSearch] = useState("");

    if (editing === null) return null;

    const pixPreview = editing.pix_price ?? +(editing.base_price * 0.95).toFixed(2);
    const sizes = getSizes();
    const colors = editing.colors || [];

    const colorByName = new Map(productColors.map((c) => [c.name, c]));
    const colorMatches = pickerSearch.trim()
        ? productColors.filter((c) =>
            c.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()),
        )
        : productColors;
    const colorList = colorMatches.slice(0, COLOR_LIST_LIMIT);
    const colorHidden = colorMatches.length - colorList.length;

    const sizeList = pickerSearch.trim()
        ? DEFAULT_SIZES.filter((s) =>
            s.toLowerCase().includes(pickerSearch.trim().toLowerCase()),
        )
        : DEFAULT_SIZES;

    const closePicker = () => {
        setPicker(null);
        setPickerSearch("");
    };

    const gradeTotal =
        sizes.length > 0 && colors.length > 0
            ? colors.reduce(
                (sum, c) =>
                    sum + sizes.reduce((s2, sz) => s2 + (getSkuStock(sz, c) || 0), 0),
                0,
            )
            : editing.stock;

    const badges = [
        { key: "featured", label: "Selo destaque", desc: "Aumenta a visibilidade na página inicial.", icon: Star },
        { key: "is_new", label: "Selo lançamento", desc: "Marca o produto como novidade no catálogo.", icon: Sparkles },
        { key: "is_bestseller", label: "Selo mais vendido", desc: "Destaca o produto como campeão de vendas.", icon: TrendingUp },
    ] as const;

    return (
        <div className="p-6">
            {/* ── HEADER ── */}
            <div className="mb-4">
                <button
                    onClick={() => setEditing(null)}
                    className="mb-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                    <ChevronLeft size={13} /> Produtos / Lista de produtos /{" "}
                    {editing.id ? "Editar produto" : "Novo produto"}
                </button>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="max-w-2xl truncate text-2xl font-bold">
                        {editing.id
                            ? `Editar ${editing.name || "Produto"}`
                            : "Novo Produto"}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setEditing(null)}
                            className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !editing.name}
                            className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 text-sm font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                        >
                            <Save size={15} />
                            {saving ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── HIGHLIGHTS ── */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { icon: Hash, title: "Código do produto", value: editing.code || "—" },
                    { icon: Package, title: "Estoque atual", value: String(gradeTotal) },
                    {
                        icon: CircleDollarSign,
                        title: "Preço de venda",
                        value: `R$ ${(editing.sale_price ?? editing.base_price).toFixed(2)}`,
                    },
                    {
                        icon: Eye,
                        title: "Status",
                        value: editing.active ? "Ativo" : "Inativo",
                    },
                ].map(({ icon: Icon, title, value }) => (
                    <div
                        key={title}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#8C2F39]">
                            <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] uppercase tracking-wide text-gray-400">
                                {title}
                            </p>
                            <p className="truncate text-sm font-bold">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ════════ COLUNA PRINCIPAL ════════ */}
                <div className="space-y-6 lg:col-span-2">
                    {/* ── NOME ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                            <Tag size={16} /> Nome do produto
                        </h3>
                        <input
                            type="text"
                            value={editing.name}
                            onChange={(e) =>
                                setEditing({
                                    ...editing,
                                    name: e.target.value,
                                    slug: slugify(e.target.value),
                                })
                            }
                            className="input"
                            placeholder="Ex: Top Fitness Refúgio"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-400">
                            <span>Dê ao seu produto um nome curto e claro.</span>
                            <span>{(editing.name || "").length} / 200</span>
                        </div>
                        <div className="mt-4">
                            <label className="label">Código / Referência</label>
                            <input
                                type="text"
                                value={editing.code || ""}
                                onChange={(e) =>
                                    setEditing({ ...editing, code: e.target.value })
                                }
                                className="input"
                                placeholder="FEM-001"
                            />
                        </div>
                    </section>

                    {/* ── IMAGENS E VÍDEO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                            <Images size={16} /> Imagens e vídeo
                        </h3>
                        <p className="mb-3 text-xs text-gray-400">
                            *Primeira = frente · Segunda = costas · demais = detalhes
                        </p>

                        <label
                            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"}`}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => e.target.files && uploadImages(e.target.files)}
                            />
                            <Upload
                                size={18}
                                className={
                                    uploading ? "animate-pulse text-gray-400" : "text-gray-500"
                                }
                            />
                            <span className="text-sm text-gray-500">
                                {uploading ? "Enviando..." : "Clique para enviar fotos"}
                            </span>
                        </label>

                        <div className="my-3 flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-xs text-gray-400">ou cole URLs</span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        <textarea
                            value={imagesInput}
                            onChange={(e) => setImagesInput(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 px-4 py-2 font-mono text-sm focus:border-[#8C2F39] focus:outline-none"
                            placeholder={
                                "https://exemplo.com/frente.jpg\nhttps://exemplo.com/costas.jpg"
                            }
                        />
                        {imagesInput.split("\n").filter(Boolean).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {imagesInput
                                    .split("\n")
                                    .filter(Boolean)
                                    .map((url, i) => (
                                        <div
                                            key={i}
                                            className="group relative h-24 w-20 overflow-hidden rounded-lg bg-gray-100"
                                        >
                                            <img
                                                src={url.trim()}
                                                alt=""
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                            <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                                                {i === 0
                                                    ? "Principal"
                                                    : i === 1
                                                        ? "Costas"
                                                        : `Foto ${i + 1}`}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setImagesInput(
                                                        imagesInput
                                                            .split("\n")
                                                            .filter((_, idx) => idx !== i)
                                                            .join("\n"),
                                                    )
                                                }
                                                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}
                        <div className="mt-4 border-t pt-4">
                            <label className="label">Vídeo do produto (YouTube)</label>
                            <input
                                type="text"
                                value={editing.video_url || ""}
                                onChange={(e) =>
                                    setEditing({
                                        ...editing,
                                        video_url: e.target.value || null,
                                    })
                                }
                                className="input"
                                placeholder="https://www.youtube.com/watch?v=... (aceita youtu.be e shorts)"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Aparece como miniatura com play na galeria do produto no site
                            </p>
                        </div>
                    </section>

                    {/* ── DESCRIÇÃO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">
                            Descrição do produto
                        </h3>
                        <textarea
                            value={editing.description || ""}
                            onChange={(e) =>
                                setEditing({ ...editing, description: e.target.value })
                            }
                            rows={6}
                            className="input"
                            placeholder="Descreva o produto..."
                        />
                    </section>

                    {/* ── PREÇO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">Preço</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="label">Preço cheio (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editing.base_price}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            base_price: Number.parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="input"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Aparece riscado quando há desconto
                                </p>
                            </div>
                            <div>
                                <label className="label">Preço PIX (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editing.pix_price ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            pix_price: Number.parseFloat(e.target.value) || null,
                                        })
                                    }
                                    className="input"
                                    placeholder={`${pixPreview.toFixed(2)} (5% off padrão)`}
                                />
                            </div>
                            <div>
                                <label className="label">Preço promocional (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editing.sale_price ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            sale_price: Number.parseFloat(e.target.value) || null,
                                        })
                                    }
                                    className="input"
                                    placeholder="Deixe vazio se não há"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── VARIAÇÕES (agrupado: Cor + Tamanho) ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">Variações</h3>

                        {/* característica primária: cor */}
                        <div className="rounded-lg border border-gray-100 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Palette size={15} className="text-gray-400" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            Característica Primária
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">
                                            Cor
                                            {colors.length > 0 && (
                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                    {colors.length} selecionada(s)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {productColors.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPicker("cor")}
                                        className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#8C2F39] hover:underline"
                                    >
                                        <Plus size={15} /> Adicionar opções
                                    </button>
                                )}
                            </div>

                            {productColors.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                    Nenhuma cor cadastrada ainda. Cadastre em Produtos →
                                    Características.
                                </p>
                            ) : colors.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                    Nenhuma cor neste produto ainda.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {colors.map((name) => {
                                        const c = colorByName.get(name);
                                        return (
                                            <span
                                                key={name}
                                                className="flex items-center gap-2 rounded-full border border-[#8C2F39]/30 bg-[#8C2F39]/5 py-1 pl-1 pr-2 text-sm text-[#8C2F39]"
                                            >
                                                <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-gray-100">
                                                    {c?.image_url && (
                                                        <img
                                                            src={c.image_url}
                                                            alt=""
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    )}
                                                </span>
                                                {name}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleColor(name)}
                                                    className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-xs text-[#8C2F39]/60 hover:bg-[#8C2F39] hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* característica secundária: tamanho */}
                        <div className="mt-4 rounded-lg border border-gray-100 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Ruler size={15} className="text-gray-400" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            Característica Secundária
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">
                                            Tamanho
                                            {sizes.length > 0 && (
                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                    {sizes.length} selecionado(s)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPicker("tamanho")}
                                    className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#8C2F39] hover:underline"
                                >
                                    <Plus size={15} /> Adicionar opções
                                </button>
                            </div>

                            {sizes.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                    Nenhum tamanho neste produto ainda.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map((size) => (
                                        <span
                                            key={size}
                                            className="flex items-center gap-2 rounded-full border border-[#8C2F39]/30 bg-[#8C2F39]/5 px-3 py-1 text-sm font-medium text-[#8C2F39]"
                                        >
                                            {size}
                                            <button
                                                type="button"
                                                onClick={() => toggleSize(size)}
                                                className="flex h-4 w-4 items-center justify-center rounded-full text-xs text-[#8C2F39]/60 hover:bg-[#8C2F39] hover:text-white"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* tabela de medidas */}
                        {sizes.length > 0 && (
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Tabela de medidas (cm)
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-200 px-3 py-2 text-left text-gray-500">
                                                    Medida
                                                </th>
                                                {sizes.map((s) => (
                                                    <th
                                                        key={s}
                                                        className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-700"
                                                    >
                                                        {s}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {MEASURE_KEYS.map((key) => (
                                                <tr key={key}>
                                                    <td className="border border-gray-200 px-3 py-2 font-medium capitalize text-gray-500">
                                                        {key}
                                                    </td>
                                                    {sizes.map((size) => (
                                                        <td
                                                            key={size}
                                                            className="border border-gray-200 p-1"
                                                        >
                                                            <input
                                                                type="text"
                                                                value={editing.size_chart?.[size]?.[key] || ""}
                                                                onChange={(e) => {
                                                                    const chart = {
                                                                        ...(editing.size_chart || {}),
                                                                    };
                                                                    chart[size] = {
                                                                        ...(chart[size] || {}),
                                                                        [key]: e.target.value,
                                                                    };
                                                                    setEditing({ ...editing, size_chart: chart });
                                                                }}
                                                                className="w-full rounded border-0 bg-transparent px-1 py-1 text-center text-xs focus:border focus:border-[#8C2F39] focus:bg-white"
                                                                placeholder="—"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── GRADE DE ESTOQUE ── */}
                    {sizes.length > 0 && colors.length > 0 && (
                        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 font-semibold text-gray-700">
                                Grade de estoque (Tamanho × Cor)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="border border-gray-200 px-3 py-2 text-left text-gray-500">
                                                Cor \ Tam
                                            </th>
                                            {sizes.map((s) => (
                                                <th
                                                    key={s}
                                                    className="border border-gray-200 px-3 py-2 text-center font-semibold"
                                                >
                                                    {s}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {colors.map((color) => (
                                            <tr key={color}>
                                                <td className="whitespace-nowrap border border-gray-200 px-3 py-2 font-medium text-gray-600">
                                                    {color}
                                                </td>
                                                {sizes.map((size) => (
                                                    <td key={size} className="border border-gray-200 p-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={getSkuStock(size, color)}
                                                            onChange={(e) =>
                                                                setSkuStock(
                                                                    size,
                                                                    color,
                                                                    Number.parseInt(e.target.value) || 0,
                                                                )
                                                            }
                                                            className="w-14 rounded border px-1 py-1.5 text-center text-xs focus:border-[#8C2F39] focus:ring-1 focus:ring-[#8C2F39]"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ── FOTOS POR COR ── */}
                    {colors.length > 0 && (
                        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                                <Images size={16} /> Fotos por cor
                            </h3>
                            <div className="space-y-5">
                                {colors.map((color) => {
                                    const colorImgs = getColorImages(color);
                                    return (
                                        <div
                                            key={color}
                                            className="rounded-lg border border-gray-100 p-4"
                                        >
                                            <p className="mb-2 text-sm font-medium">{color}</p>

                                            {colorImgs.length > 0 && (
                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    {colorImgs.map((url, i) => (
                                                        <div
                                                            key={i}
                                                            className="group relative h-20 w-16 overflow-hidden rounded-lg bg-gray-100"
                                                        >
                                                            <img
                                                                src={url}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeColorImage(color, url)}
                                                                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <label
                                                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 transition-colors ${uploading
                                                    ? "border-gray-200 bg-gray-50"
                                                    : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"
                                                    }`}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    disabled={uploading}
                                                    onChange={(e) =>
                                                        e.target.files &&
                                                        uploadColorImages(color, e.target.files)
                                                    }
                                                />
                                                <Upload size={16} className="text-gray-500" />
                                                <span className="text-sm text-gray-500">
                                                    {uploading
                                                        ? "Enviando..."
                                                        : `Enviar fotos de ${color}`}
                                                </span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ── PESO E DIMENSÕES ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                            <Weight size={16} /> Peso e dimensões
                        </h3>
                        <p className="mb-4 text-xs text-gray-400">
                            Usado para calcular o frete via Melhor Envio
                        </p>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div>
                                <label className="label">Peso (kg)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={editing.weight_kg ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            weight_kg: Number.parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="input"
                                    placeholder="0.300"
                                />
                            </div>
                            <div>
                                <label className="label">Comprimento (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={editing.pkg_length_cm ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            pkg_length_cm: Number.parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="input"
                                    placeholder="20"
                                />
                            </div>
                            <div>
                                <label className="label">Largura (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={editing.pkg_width_cm ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            pkg_width_cm: Number.parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="input"
                                    placeholder="15"
                                />
                            </div>
                            <div>
                                <label className="label">Altura (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={editing.pkg_height_cm ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            pkg_height_cm: Number.parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="input"
                                    placeholder="5"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* ════════ COLUNA LATERAL ════════ */}
                <div className="space-y-6">
                    {/* ── STATUS ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">
                                    Produto ativo
                                </p>
                                <p className="text-xs text-gray-400">
                                    Disponível para venda na loja virtual.
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={editing.active}
                                onChange={() =>
                                    setEditing({ ...editing, active: !editing.active })
                                }
                            />
                        </div>
                        <div className="mt-4 border-t pt-4">
                            <label className="label">Estoque geral (sem grade)</label>
                            <input
                                type="number"
                                min="0"
                                value={editing.stock}
                                onChange={(e) =>
                                    setEditing({
                                        ...editing,
                                        stock: Number.parseInt(e.target.value) || 0,
                                    })
                                }
                                className="input"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Use a grade se tiver variações
                            </p>
                        </div>
                    </section>

                    {/* ── CATEGORIA ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">
                            Categoria principal
                        </h3>
                        <div className="space-y-2">
                            <select
                                value={selectedCategoryPaiId || ""}
                                onChange={(e) => {
                                    setSelectedCategoryPaiId(e.target.value || null);
                                    setSelectedCategoryFilhoId(null);
                                    setEditing({ ...editing, category_id: null });
                                }}
                                className="input"
                            >
                                <option value="">— Categoria —</option>
                                {categoryTree.map((pai) => (
                                    <option key={pai.id} value={pai.id}>
                                        {pai.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedCategoryFilhoId || ""}
                                disabled={!selectedCategoryPaiId}
                                onChange={(e) => {
                                    setSelectedCategoryFilhoId(e.target.value || null);
                                    setEditing({ ...editing, category_id: null });
                                }}
                                className="input disabled:bg-gray-50 disabled:text-gray-400"
                            >
                                <option value="">— Subcategoria —</option>
                                {(
                                    categoryTree.find((p) => p.id === selectedCategoryPaiId)
                                        ?.children ?? []
                                ).map((filho) => (
                                    <option key={filho.id} value={filho.id}>
                                        {filho.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={editing.category_id || ""}
                                disabled={!selectedCategoryFilhoId}
                                onChange={(e) =>
                                    setEditing({
                                        ...editing,
                                        category_id: e.target.value || null,
                                    })
                                }
                                className="input disabled:bg-gray-50 disabled:text-gray-400"
                            >
                                <option value="">— Específica —</option>
                                {(
                                    categoryTree
                                        .find((p) => p.id === selectedCategoryPaiId)
                                        ?.children.find((f) => f.id === selectedCategoryFilhoId)
                                        ?.children ?? []
                                ).map((neto) => (
                                    <option key={neto.id} value={neto.id}>
                                        {neto.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    {/* ── APRESENTAÇÃO (SELOS) ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">Apresentação</h3>
                        <div className="space-y-4">
                            {badges.map(({ key, label, desc, icon: Icon }) => {
                                const val = editing[key as keyof typeof editing] as boolean;
                                return (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon size={15} className="mt-0.5 shrink-0 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    {label}
                                                </p>
                                                <p className="text-xs text-gray-400">{desc}</p>
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={val}
                                            onChange={() =>
                                                setEditing({ ...editing, [key]: !val })
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── SEO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                            <Globe size={16} /> Otimização para busca (SEO)
                        </h3>

                        <p className="mb-1 text-xs font-medium text-gray-500">
                            Visualização do resultado da busca
                        </p>
                        <div className="mb-4 rounded-lg border bg-gray-50 p-3">
                            <p className="truncate text-xs text-green-700">
                                feminnita.com.br/produto/{editing.slug || "nome-do-produto"}
                            </p>
                            <p className="truncate text-sm font-medium text-blue-700">
                                {editing.meta_title || editing.name || "Meta título"}
                            </p>
                            <p className="line-clamp-2 text-xs text-gray-500">
                                {editing.meta_description || "Meta descrição"}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">URL (slug)</label>
                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 focus-within:border-[#8C2F39]">
                                    <span className="whitespace-nowrap border-r border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                                        /produto/
                                    </span>
                                    <input
                                        type="text"
                                        value={editing.slug}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                slug: e.target.value
                                                    .toLowerCase()
                                                    .replace(/\s+/g, "-")
                                                    .replace(/[^a-z0-9-]/g, ""),
                                            })
                                        }
                                        className="w-full flex-1 px-3 py-2 text-sm focus:outline-none"
                                        placeholder="nome-do-produto"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Meta title</label>
                                <input
                                    type="text"
                                    value={editing.meta_title || ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            meta_title: e.target.value || null,
                                        })
                                    }
                                    className="input"
                                    placeholder={editing.name || "Título para o Google"}
                                    maxLength={70}
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    {(editing.meta_title || "").length}/70 caracteres
                                </p>
                            </div>
                            <div>
                                <label className="label">Meta description</label>
                                <textarea
                                    value={editing.meta_description || ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            meta_description: e.target.value || null,
                                        })
                                    }
                                    rows={3}
                                    className="input"
                                    placeholder="Descrição que aparece no resultado de busca do Google"
                                    maxLength={160}
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    {(editing.meta_description || "").length}/160 caracteres
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* ── FOOTER ACTIONS ── */}
            <div className="mt-6 flex justify-end gap-3 pb-8">
                <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border px-6 py-3 hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !editing.name}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-8 py-3 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? "Salvando..." : "Salvar Produto"}
                </button>
            </div>

            {/* ── SIDEBAR: ADICIONAR OPÇÕES (estilo Tray) ── */}
            {picker !== null && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={closePicker} />
                    <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
                        {/* header */}
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <h4 className="font-semibold text-gray-800">
                                Adicionar: {picker === "cor" ? "Cor" : "Tamanho"}
                            </h4>
                            <button
                                type="button"
                                onClick={closePicker}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* conteúdo em 2 colunas */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* coluna esquerda: busca + lista */}
                            <div className="flex flex-1 flex-col border-r">
                                <div className="border-b px-5 py-3">
                                    <div className="relative">
                                        <Search
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        />
                                        <input
                                            type="text"
                                            value={pickerSearch}
                                            onChange={(e) => setPickerSearch(e.target.value)}
                                            autoFocus
                                            className="input"
                                            style={{ paddingLeft: "2.25rem" }}
                                            placeholder={
                                                picker === "cor"
                                                    ? "Nome da cor"
                                                    : "Nome do tamanho"
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-5 py-2">
                                    {picker === "cor" ? (
                                        colorList.length === 0 ? (
                                            <p className="py-6 text-center text-sm text-gray-400">
                                                Nenhuma cor encontrada.
                                            </p>
                                        ) : (
                                            <>
                                                {colorList.map((c) => {
                                                    const isSelected = colors.includes(c.name);
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            className="flex items-center justify-between gap-3 border-b border-gray-50 py-2.5"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border bg-gray-100">
                                                                    {c.image_url && (
                                                                        <img
                                                                            src={c.image_url}
                                                                            alt=""
                                                                            loading="lazy"
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    )}
                                                                </span>
                                                                <span className="truncate text-sm text-gray-700">
                                                                    {c.name}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleColor(c.name)}
                                                                disabled={isSelected}
                                                                className={`shrink-0 rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${isSelected
                                                                    ? "cursor-default border-gray-200 text-gray-300"
                                                                    : "border-[#8C2F39] text-[#8C2F39] hover:bg-red-50/40"
                                                                    }`}
                                                            >
                                                                {isSelected
                                                                    ? "Selecionado"
                                                                    : "Selecionar"}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {colorHidden > 0 && (
                                                    <p className="py-3 text-center text-xs text-gray-400">
                                                        Mostrando {colorList.length} de{" "}
                                                        {colorMatches.length} — digite para refinar
                                                        a busca.
                                                    </p>
                                                )}
                                            </>
                                        )
                                    ) : sizeList.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-gray-400">
                                            Nenhum tamanho encontrado.
                                        </p>
                                    ) : (
                                        sizeList.map((size) => {
                                            const isSelected = sizes.includes(size);
                                            return (
                                                <div
                                                    key={size}
                                                    className="flex items-center justify-between gap-3 border-b border-gray-50 py-2.5"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-gray-50 text-xs font-semibold text-gray-600">
                                                            {size}
                                                        </span>
                                                        <span className="truncate text-sm text-gray-700">
                                                            Tamanho {size}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSize(size)}
                                                        disabled={isSelected}
                                                        className={`shrink-0 rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${isSelected
                                                            ? "cursor-default border-gray-200 text-gray-300"
                                                            : "border-[#8C2F39] text-[#8C2F39] hover:bg-red-50/40"
                                                            }`}
                                                    >
                                                        {isSelected ? "Selecionado" : "Selecionar"}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* coluna direita: itens selecionados */}
                            <div className="flex w-72 shrink-0 flex-col">
                                <div className="border-b px-5 py-3">
                                    <h5 className="text-sm font-semibold text-gray-700">
                                        Itens selecionados
                                    </h5>
                                </div>
                                <div className="flex-1 overflow-y-auto px-5 py-2">
                                    {picker === "cor" ? (
                                        colors.length === 0 ? (
                                            <p className="py-4 text-sm text-gray-400">
                                                Nenhuma opção selecionada.
                                            </p>
                                        ) : (
                                            colors.map((name) => {
                                                const c = colorByName.get(name);
                                                return (
                                                    <div
                                                        key={name}
                                                        className="flex items-center justify-between gap-2 border-b border-gray-50 py-2"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-gray-100">
                                                                {c?.image_url && (
                                                                    <img
                                                                        src={c.image_url}
                                                                        alt=""
                                                                        loading="lazy"
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                )}
                                                            </span>
                                                            <span className="truncate text-sm text-gray-700">
                                                                {name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleColor(name)}
                                                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )
                                    ) : sizes.length === 0 ? (
                                        <p className="py-4 text-sm text-gray-400">
                                            Nenhuma opção selecionada.
                                        </p>
                                    ) : (
                                        sizes.map((size) => (
                                            <div
                                                key={size}
                                                className="flex items-center justify-between gap-2 border-b border-gray-50 py-2"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-gray-50 text-[10px] font-semibold text-gray-600">
                                                        {size}
                                                    </span>
                                                    <span className="truncate text-sm text-gray-700">
                                                        Tamanho {size}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSize(size)}
                                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* footer */}
                        <div className="flex items-center justify-between border-t px-5 py-3">
                            <button
                                type="button"
                                onClick={closePicker}
                                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={closePicker}
                                className="rounded-lg bg-[#8C2F39] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7a2832]"
                            >
                                Adicionar
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <style>
                {
                    ".label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.25rem}.input{width:100%;padding:.5rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.875rem;outline:none}.input:focus{border-color:#8C2F39;box-shadow:0 0 0 2px rgba(140,47,57,.15)}"
                }
            </style>
        </div>
    );
}
