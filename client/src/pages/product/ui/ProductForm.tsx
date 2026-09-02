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
    Video,
} from "lucide-react";
import { slugify } from "../domain";
import type { useProductsAdmin } from "../useProductsAdmin";

const DEFAULT_SIZES = ["P", "M", "G", "GG", "48", "50", "52"];

const MEASURE_KEYS = ["busto", "cintura", "quadril"];

type ProductsVM = ReturnType<typeof useProductsAdmin>;

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
        uploadVideo,
        getSizes,
        getSkuStock,
        setSkuStock,
        toggleSize,
        toggleColor,
        getColorImages,
        uploadColorImages,
        removeColorImage,
    } = vm;

    if (editing === null) return null;

    const pixPreview = editing.pix_price ?? +(editing.base_price * 0.95).toFixed(2);
    const sizes = getSizes();
    const colors = editing.colors || [];

    return (
        <div className="max-w-4xl p-6">
            <button
                onClick={() => setEditing(null)}
                className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800"
            >
                <ChevronLeft size={18} /> Voltar para lista
            </button>

            <h2 className="mb-6 text-2xl font-bold">
                {editing.id ? "Editar Produto" : "Novo Produto"}
            </h2>

            <div className="space-y-6">
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                        <Tag size={16} /> Informações básicas
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="label">Nome do Produto *</label>
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
                        </div>
                        <div>
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
                        <div className="md:col-span-2">
                            <label className="label">Categoria</label>
                            <div className="grid gap-2 md:grid-cols-3">
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
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Descrição</label>
                            <textarea
                                value={editing.description || ""}
                                onChange={(e) =>
                                    setEditing({ ...editing, description: e.target.value })
                                }
                                rows={3}
                                className="input"
                                placeholder="Descreva o produto..."
                            />
                        </div>
                    </div>
                </section>

                {/* ── PREÇOS ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-gray-700">Preços</h3>
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

                {/* ── EMBALAGEM ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                        <Weight size={16} /> Peso e dimensões da embalagem
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

                {/* ── TAMANHOS ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                        <Ruler size={16} /> Tamanhos disponíveis
                    </h3>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {DEFAULT_SIZES.map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(size)}
                                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${sizes.includes(size)
                                    ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                    {/* Tabela de medidas */}
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

                {/* ── CORES ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                        <Palette size={16} /> Cores disponíveis
                    </h3>
                    {productColors.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Nenhuma cor cadastrada ainda. Cadastre em Produtos →
                            Características.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {productColors.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleColor(c.name)}
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${colors.includes(c.name)
                                        ? "border-[#8C2F39] bg-[#8C2F39]/5 text-[#8C2F39]"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border">
                                        <img
                                            src={c.image_url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </span>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* -- Fotos por cor -- */}
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

                {/* ── IMAGENS ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-gray-700">Imagens</h3>
                    <p className="mb-3 text-xs text-gray-400">
                        *Primeira = frente · Segunda = costas · demais = detalhes
                    </p>

                    {/* File upload */}
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
                                                ? "Frente"
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
                    <div className="mt-6 border-t border-gray-100 pt-4">
                        <label className="label flex items-center gap-2">
                            <Video size={14} /> URL do vídeo (Cloudinary)
                        </label>
                        <p className="mb-3 text-xs text-gray-400">
                            Vídeo por família (SKU pai) — vale para todas as cores/variações, não é por cor.
                        </p>

                        {/* Upload de vídeo */}
                        <label
                            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 transition-colors ${uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"}`}
                        >
                            <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadVideo(file);
                                }}
                            />
                            <Upload
                                size={18}
                                className={uploading ? "animate-pulse text-gray-400" : "text-gray-500"}
                            />
                            <span className="text-sm text-gray-500">
                                {uploading ? "Enviando..." : "Enviar vídeo para o Cloudinary"}
                            </span>
                        </label>

                        <div className="my-3 flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-xs text-gray-400">ou cole a URL</span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>

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
                            placeholder="https://res.cloudinary.com/.../video.mp4"
                        />

                        {editing.video_url && (
                            <div className="mt-3">
                                <video
                                    controls
                                    src={editing.video_url}
                                    className="max-h-48 w-full max-w-xs rounded-lg bg-black"
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* ── SEO ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                        <Globe size={16} /> SEO
                    </h3>
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
                                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
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
                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
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
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                placeholder="Descrição que aparece no resultado de busca do Google"
                                maxLength={160}
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                {(editing.meta_description || "").length}/160 caracteres
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── ESTOQUE GERAL + BADGES ── */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-gray-700">
                        Estoque e visibilidade
                    </h3>
                    <div className="mb-4 grid gap-4 md:grid-cols-2">
                        <div>
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
                                Use a grade acima se tiver variações
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { key: "active", label: "Ativo", icon: Eye },
                            { key: "featured", label: "Destaque", icon: Star },
                            { key: "is_new", label: "Novidade", icon: Sparkles },
                            {
                                key: "is_bestseller",
                                label: "Mais Vendido",
                                icon: TrendingUp,
                            },
                        ].map(({ key, label, icon: Icon }) => {
                            const val = editing[key as keyof typeof editing] as boolean;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setEditing({ ...editing, [key]: !val })}
                                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${val
                                        ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <Icon size={15} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── ACTIONS ── */}
                <div className="flex gap-3 pb-8">
                    <button
                        onClick={handleSave}
                        disabled={saving || !editing.name}
                        className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-8 py-3 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Salvando..." : "Salvar Produto"}
                    </button>
                    <button
                        onClick={() => setEditing(null)}
                        className="rounded-lg border px-6 py-3 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>

            <style>
                {
                    ".label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.25rem}.input{width:100%;padding:.5rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.875rem;outline:none}.input:focus{border-color:#8C2F39;box-shadow:0 0 0 2px rgba(140,47,57,.15)}"
                }
            </style>
        </div>
    );
}
