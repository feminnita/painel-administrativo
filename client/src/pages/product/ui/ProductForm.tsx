import { useEffect, useState, type KeyboardEvent } from "react";
import {
    ChevronLeft,
    ChevronDown,
    Tag,
    Weight,
    Ruler,
    Palette,
    Upload,
    Globe,
    Save,
    EyeOff,
    Sparkles,
    TrendingUp,
    Images,
    Hash,
    Package,
    ShoppingBag,
    Search,
    X,
    Plus,
    Trash2,
    Wand2,
    Percent,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { SizeChartPreview } from "./SizeChartPreview";
import { slugify, normColor, parseDecimal } from "../domain";
import { BRANDS } from "../types";
import type { Sku } from "../types";
import type { useProductsAdmin } from "../useProductsAdmin";

const DEFAULT_SIZES = ["PP", "P", "M", "G", "GG", "XG", "XGG", "48", "50", "52"];

// Sugestões de cor exibidas enquanto a cliente digita (não despeja o mestre inteiro).
const COLOR_SUGGEST_LIMIT = 8;

type ProductsVM = ReturnType<typeof useProductsAdmin>;

// O painel de "Adicionar opções" agora só serve TAMANHO — a cor virou campo
// digita-e-cria dentro do próprio produto.
type PickerKind = "tamanho" | null;

/** ISO string -> valor de <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function discountPct(base: number, sale: number | null): number | null {
    if (sale == null || !base || sale >= base) return null;
    return Math.round((1 - sale / base) * 100);
}

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
        getVariations,
        updateVariation,
        generateVariations,
        addVariation,
        deleteVariation,
        toggleSize,
        toggleColor,
        createColor,
        getColorImages,
        uploadColorImages,
        removeColorImage,
        clearAllImages,
    } = vm;

    const [picker, setPicker] = useState<PickerKind>(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [colorQuery, setColorQuery] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [addColor, setAddColor] = useState("");
    const [addSize, setAddSize] = useState("");

    // Aviso ao sair com o formulário aberto (fechar/atualizar a aba).
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    if (editing === null) return null;

    const pixPreview = editing.pix_price ?? +(editing.base_price * 0.95).toFixed(2);
    const sizes = getSizes();
    const colors = editing.colors || [];
    const variations = getVariations();

    // Agrupamento por COR: uma linha por cor (accordion), com os tamanhos
    // dentro ao expandir. Apenas reorganização visual — o modelo de dados
    // (um Sku por cor×tamanho) segue intacto.
    const variationsByColor: Array<[string, Sku[]]> = (() => {
        const map = new Map<string, Sku[]>();
        for (const sku of variations) {
            const arr = map.get(sku.color);
            if (arr) arr.push(sku);
            else map.set(sku.color, [sku]);
        }
        return Array.from(map.entries());
    })();
    // Contador do topo: pares sem foto (mesma regra do antigo selo por linha —
    // a cor não tem imagem cadastrada).
    const pairsWithoutPhoto = variations.filter(
        (s) => getColorImages(s.color).length === 0,
    ).length;

    // Slugs das categorias marcadas (pai → filho → específica), p/ resolver a
    // tabela de medidas herdada.
    const catPai = categoryTree.find((p) => p.id === selectedCategoryPaiId);
    const catFilho = catPai?.children.find((f) => f.id === selectedCategoryFilhoId);
    const catNeto = catFilho?.children.find((n) => n.id === editing.category_id);
    const categorySlugs = [catPai?.slug, catFilho?.slug, catNeto?.slug].filter(
        (s): s is string => Boolean(s),
    );

    const colorByName = new Map(productColors.map((c) => [c.name, c]));

    // ── CAMPO DIGITA-E-CRIA (cor) ──
    // Ordena o mestre pelas mais usadas primeiro (usage); sem usage, por nome.
    // Filtra pelo NORMALIZADO do que foi digitado e nunca despeja as 692.
    const colorQ = colorQuery.trim();
    const colorQn = normColor(colorQ);
    const sortedColors = [...productColors].sort((a, b) => {
        const ua = a.usage;
        const ub = b.usage;
        if (ua != null && ub != null && ua !== ub) return ub - ua;
        if (ua != null && ub == null) return -1;
        if (ua == null && ub != null) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
    });
    const colorSuggestions = (colorQn
        ? sortedColors.filter((c) => normColor(c.name).includes(colorQn))
        : sortedColors
    )
        .filter((c) => !colors.includes(c.name))
        .slice(0, COLOR_SUGGEST_LIMIT);
    // Match normalizado: se o digitado já existe no mestre, é essa a cor canônica.
    const colorExact = colorQn
        ? productColors.find((c) => normColor(c.name) === colorQn)
        : undefined;
    const canCreateColor = colorQ.length > 0 && !colorExact;

    const selectColor = (name: string) => {
        if (!colors.includes(name)) toggleColor(name);
        setColorQuery("");
    };
    const handleCreateColor = async () => {
        const created = await createColor(colorQ);
        if (created) selectColor(created.name);
    };
    // Enter: casa exato → vincula à canônica; senão → cria na hora.
    const onColorQueryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (colorExact) selectColor(colorExact.name);
        else if (canCreateColor) void handleCreateColor();
    };

    const sizeList = pickerSearch.trim()
        ? DEFAULT_SIZES.filter((s) =>
            s.toLowerCase().includes(pickerSearch.trim().toLowerCase()),
        )
        : DEFAULT_SIZES;

    const closePicker = () => {
        setPicker(null);
        setPickerSearch("");
    };

    const cancel = () => {
        if (window.confirm("Descartar alterações não salvas?")) setEditing(null);
    };

    // Estoque atual = soma das variações (fonte StockHub); fallback ao estoque geral.
    const stockTotal =
        variations.length > 0
            ? variations.reduce((sum, s) => sum + (s.stock_qty || 0), 0)
            : editing.stock;

    const salePct = discountPct(editing.base_price, editing.sale_price);
    const promoOn = editing.sale_price != null;

    // Marcadores (flags no produto), independentes entre si e da categoria.
    // Lançamento/Mais Vendido/Outlet voltaram a ser MARCADORES (não mais
    // categorias homônimas, que foram desativadas).
    const badges = [
        { key: "is_new", label: "Lançamento", desc: "Exibe o produto na vitrine de Lançamentos.", icon: Sparkles },
        { key: "is_bestseller", label: "Mais Vendido", desc: "Exibe o produto na vitrine de Mais Vendidos.", icon: TrendingUp },
        { key: "is_outlet", label: "Outlet", desc: "Exibe o produto na vitrine de Outlet.", icon: Percent },
    ] as const;

    const expandAll = () =>
        setExpanded(new Set(variationsByColor.map(([color]) => color)));
    const collapseAll = () => setExpanded(new Set());
    const toggleExpand = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    return (
        <div className="p-6">
            {/* ── HEADER ── */}
            <div className="mb-4">
                <button
                    onClick={cancel}
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
                            onClick={cancel}
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

            {/* ── CARTÕES DE LEITURA ── */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { icon: Hash, title: "Código do produto", value: editing.code || "—" },
                    { icon: Package, title: "Estoque atual", value: String(stockTotal) },
                    { icon: TrendingUp, title: "Quantidade vendida", value: "—" },
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
                {/* Últimos pedidos */}
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#8C2F39]">
                        <ShoppingBag size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[11px] uppercase tracking-wide text-gray-400">
                            Últimos 10 pedidos
                        </p>
                        <a
                            href={editing.id ? `/pedidos?produto=${editing.id}` : "/pedidos"}
                            className="truncate text-sm font-bold text-[#8C2F39] hover:underline"
                        >
                            Ver pedidos
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ════════ COLUNA PRINCIPAL ════════ */}
                <div className="space-y-6 lg:col-span-2">
                    {/* ── NOME + DADOS BÁSICOS ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
                            <Tag size={16} /> Nome do produto
                        </h3>
                        <input
                            type="text"
                            value={editing.name}
                            maxLength={200}
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

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="label">Código</label>
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
                            <div>
                                <label className="label">Referência</label>
                                <input
                                    type="text"
                                    value={editing.reference || ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            reference: e.target.value || null,
                                        })
                                    }
                                    className="input"
                                    placeholder="Ex: 62000"
                                />
                            </div>
                            <div>
                                <label className="label">Marca</label>
                                <select
                                    value={editing.brand || ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            brand: (e.target.value || null) as typeof editing.brand,
                                        })
                                    }
                                    className="input"
                                >
                                    <option value="">— Selecione —</option>
                                    {BRANDS.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── IMAGENS E VÍDEO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 font-semibold text-gray-700">
                                <Images size={16} /> Imagens e vídeo
                            </h3>
                            <button
                                type="button"
                                onClick={clearAllImages}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                                <Trash2 size={13} /> Remover todas as imagens
                            </button>
                        </div>
                        <p className="mb-1 text-xs font-medium text-gray-500">
                            Fotos de capa do produto (até 5)
                        </p>
                        <p className="mb-3 text-xs text-gray-400">
                            *Primeira = Principal · demais = detalhes · arraste as URLs para
                            reordenar
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
                                {uploading ? "Enviando..." : "+ Adicionar imagem"}
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
                                    .map((url, i, lines) => {
                                        return (
                                            <div
                                                key={i}
                                                draggable
                                                onDragStart={(e) =>
                                                    e.dataTransfer.setData("text/plain", String(i))
                                                }
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const from = Number(
                                                        e.dataTransfer.getData("text/plain"),
                                                    );
                                                    if (Number.isFinite(from) && from !== i) {
                                                        const next = [...lines];
                                                        const [x] = next.splice(from, 1);
                                                        next.splice(i, 0, x);
                                                        setImagesInput(next.join("\n"));
                                                    }
                                                }}
                                                className="group relative h-24 w-20 cursor-move overflow-hidden rounded-lg bg-gray-100"
                                            >
                                                <img
                                                    src={url.trim()}
                                                    alt=""
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                />
                                                <span
                                                    className={`absolute bottom-0 left-0 right-0 py-0.5 text-center text-[9px] text-white ${i === 0 ? "bg-[#8C2F39]" : "bg-black/50"}`}
                                                >
                                                    {i === 0 ? "Principal" : `Foto ${i + 1}`}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setImagesInput(
                                                            lines.filter((_, idx) => idx !== i).join("\n"),
                                                        )
                                                    }
                                                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        <div className="mt-4 border-t pt-4">
                            <div className="mb-2 flex items-center justify-between">
                                <label className="label mb-0">Vídeo do produto</label>
                                <ToggleSwitch
                                    checked={editing.video_url != null}
                                    onChange={() =>
                                        setEditing({
                                            ...editing,
                                            video_url: editing.video_url == null ? "" : null,
                                        })
                                    }
                                />
                            </div>
                            {editing.video_url != null && (
                                <input
                                    type="text"
                                    value={editing.video_url || ""}
                                    onChange={(e) =>
                                        setEditing({ ...editing, video_url: e.target.value })
                                    }
                                    className="input"
                                    placeholder="https://www.youtube.com/watch?v=... (aceita youtu.be e shorts)"
                                />
                            )}
                        </div>
                    </section>

                    {/* ── DESCRIÇÃO ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">
                            Descrição do produto
                        </h3>
                        <RichTextEditor
                            value={editing.description}
                            onChange={(html) =>
                                setEditing({ ...editing, description: html })
                            }
                            placeholder="Descreva o produto..."
                        />
                    </section>

                    {/* ── PREÇO DO PAI ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-gray-700">Preço</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="label">Preço de venda (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editing.base_price ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            // Obrigatorio: nao grava 0 no meio da digitacao.
                                            // Fica null enquanto vazio; o save bloqueia se null/<=0.
                                            base_price: parseDecimal(e.target.value) as number,
                                        })
                                    }
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Preço de custo (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editing.cost_price ?? ""}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            cost_price: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder="Custo interno"
                                />
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
                                            pix_price: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder={`${pixPreview.toFixed(2)} (5% off padrão)`}
                                />
                            </div>
                        </div>

                        {/* Promoção */}
                        <div className="mt-4 rounded-lg border border-gray-100 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Percent size={15} className="text-gray-400" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">
                                            Preço em promoção
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Preço riscado + preço promocional por período.
                                        </p>
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={promoOn}
                                    onChange={() =>
                                        setEditing({
                                            ...editing,
                                            sale_price: promoOn ? null : editing.base_price,
                                            sale_start: promoOn ? null : editing.sale_start,
                                            sale_end: promoOn ? null : editing.sale_end,
                                        })
                                    }
                                />
                            </div>
                            {promoOn && (
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                                                    sale_price: parseDecimal(e.target.value),
                                                })
                                            }
                                            className="input"
                                        />
                                        {salePct != null && (
                                            <p className="mt-1 text-xs font-semibold text-green-600">
                                                {salePct}% de desconto
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Data inicial</label>
                                        <input
                                            type="datetime-local"
                                            value={toLocalInput(editing.sale_start)}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    sale_start: fromLocalInput(e.target.value),
                                                })
                                            }
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Data final</label>
                                        <input
                                            type="datetime-local"
                                            value={toLocalInput(editing.sale_end)}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    sale_end: fromLocalInput(e.target.value),
                                                })
                                            }
                                            className="input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── DEFINIÇÃO DE VARIAÇÕES (Cor + Tamanho) ── */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-gray-700">
                                Definição de variações
                            </h3>
                            <button
                                type="button"
                                onClick={generateVariations}
                                disabled={colors.length === 0 || sizes.length === 0}
                                className="flex items-center gap-1.5 rounded-lg bg-[#8C2F39] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7a2832] disabled:opacity-40"
                            >
                                <Wand2 size={14} /> GERAR VARIAÇÕES
                            </button>
                        </div>

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
                            </div>

                            <div className="space-y-3">
                                {colors.length > 0 && (
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

                                {/* Campo digita-e-cria: sugere as cores mais usadas,
                                    casa pelo normalizado (vincula à canônica do mestre)
                                    ou cria a cor na hora — sem sair da tela. */}
                                <div>
                                    <div className="relative">
                                        <Search
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        />
                                        <input
                                            type="text"
                                            value={colorQuery}
                                            onChange={(e) => setColorQuery(e.target.value)}
                                            onKeyDown={onColorQueryKeyDown}
                                            className="input"
                                            style={{ paddingLeft: "2.25rem" }}
                                            placeholder="Digite o nome da cor (ex: Vermelho, Floral Azul)…"
                                        />
                                    </div>

                                    {colorQ.length > 0 && (
                                        <div className="mt-2 overflow-hidden rounded-lg border border-gray-100">
                                            {colorSuggestions.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => selectColor(c.name)}
                                                    className="flex w-full items-center gap-3 border-b border-gray-50 px-3 py-2 text-left last:border-0 hover:bg-gray-50"
                                                >
                                                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border bg-gray-100">
                                                        {c.image_url && (
                                                            <img
                                                                src={c.image_url}
                                                                alt=""
                                                                loading="lazy"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                                                        {c.name}
                                                    </span>
                                                    {c.usage != null && (
                                                        <span className="shrink-0 text-xs text-gray-400">
                                                            {c.usage} produto{c.usage === 1 ? "" : "s"}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}

                                            {canCreateColor && (
                                                <button
                                                    type="button"
                                                    onClick={handleCreateColor}
                                                    className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-[#8C2F39] hover:bg-red-50/40"
                                                >
                                                    <Plus size={15} className="shrink-0" />
                                                    Criar “{colorQ}”
                                                </button>
                                            )}

                                            {colorSuggestions.length === 0 && !canCreateColor && (
                                                <p className="px-3 py-2.5 text-sm text-gray-400">
                                                    Essa cor já está neste produto.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {colors.length === 0 && colorQ.length === 0 && (
                                        <p className="mt-2 text-xs text-gray-400">
                                            Nenhuma cor neste produto ainda. Digite acima para
                                            buscar ou criar.
                                        </p>
                                    )}
                                </div>
                            </div>
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

                    </section>

                    {/* ── LISTA DE VARIAÇÕES ── */}
                    {variations.length > 0 && (
                        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-semibold text-gray-700">
                                        Variações
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        {variations.length} variações · {pairsWithoutPhoto} sem foto
                                    </p>
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <button
                                        type="button"
                                        onClick={expandAll}
                                        className="font-medium text-[#8C2F39] hover:underline"
                                    >
                                        Expandir todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAll}
                                        className="font-medium text-gray-500 hover:underline"
                                    >
                                        Ocultar todos
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {variationsByColor.map(([color, skus]) => {
                                    const isOpen = expanded.has(color);
                                    const c = colorByName.get(color);
                                    const imgs = getColorImages(color);
                                    // Imagem da linha da cor: prioriza a foto real da
                                    // cor (product_color_images); cai pro swatch da
                                    // paleta. Bolinha vazia = cor sem imagem (não é erro).
                                    const rowImg = imgs[0] ?? c?.image_url;
                                    return (
                                        <div
                                            key={color}
                                            className="rounded-lg border border-gray-100"
                                        >
                                            {/* linha da cor (recolhida) */}
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(color)}
                                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                                            >
                                                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border bg-gray-100">
                                                    {rowImg && (
                                                        <img
                                                            src={rowImg}
                                                            alt=""
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    )}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                                                    {color}
                                                </span>
                                                <span className="shrink-0 text-xs text-gray-400">
                                                    {skus.length} tamanho{skus.length > 1 ? "s" : ""}
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            {/* conteúdo expandido */}
                                            {isOpen && (
                                                <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                                                    {/* foto da cor: UMA foto, opcional — não trava o salvar */}
                                                    <div>
                                                        <p className="mb-2 text-xs font-medium text-gray-500">
                                                            Foto da cor{" "}
                                                            <span className="font-normal text-gray-400">
                                                                (uma foto, opcional — não é obrigatória para
                                                                salvar)
                                                            </span>
                                                        </p>
                                                        {imgs.length > 0 ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                                    <img
                                                                        src={imgs[0]}
                                                                        alt=""
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#8C2F39] px-3 py-1.5 text-xs font-medium text-[#8C2F39] hover:bg-red-50/40">
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            disabled={uploading}
                                                                            onChange={(e) =>
                                                                                e.target.files &&
                                                                                uploadColorImages(
                                                                                    color,
                                                                                    e.target.files,
                                                                                )
                                                                            }
                                                                        />
                                                                        <Upload size={13} />
                                                                        {uploading
                                                                            ? "Enviando..."
                                                                            : "Trocar foto"}
                                                                    </label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeColorImage(color, imgs[0])
                                                                        }
                                                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
                                                                    >
                                                                        Remover foto
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-[#8C2F39] hover:bg-red-50/30">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    disabled={uploading}
                                                                    onChange={(e) =>
                                                                        e.target.files &&
                                                                        uploadColorImages(color, e.target.files)
                                                                    }
                                                                />
                                                                <Upload size={15} />
                                                                {uploading
                                                                    ? "Enviando..."
                                                                    : `Adicionar foto de ${color} (opcional)`}
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* um bloco por tamanho */}
                                                    {skus.map((sku) => {
                                                        const skuPct = discountPct(
                                                            sku.price ?? editing.base_price,
                                                            sku.sale_price,
                                                        );
                                                        const varPromoOn = sku.sale_price != null;
                                                        return (
                                                            <div
                                                                key={sku.size}
                                                                className={`space-y-4 rounded-lg border p-3 ${sku.active === false ? "border-gray-200 bg-gray-50 opacity-70" : "border-gray-100"}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-700">
                                                                        {sku.size}
                                                                    </span>
                                                                    {sku.active === false && (
                                                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                                                            <EyeOff size={11} /> inativa
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteVariation(sku)}
                                                                        className="ml-auto shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                                        title="Remover variação"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>

                                                                <div className="grid gap-4 md:grid-cols-3">
                                                                    <div>
                                                                        <label className="label">
                                                                            Preço de venda (R$)
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={sku.price ?? ""}
                                                                            onChange={(e) =>
                                                                                updateVariation(sku, {
                                                                                    price: parseDecimal(e.target.value),
                                                                                })
                                                                            }
                                                                            className="input"
                                                                            placeholder={String(
                                                                                (editing.base_price ?? 0).toFixed(2),
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="label">Referência (SKU)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={sku.reference ?? ""}
                                                                            onChange={(e) =>
                                                                                updateVariation(sku, {
                                                                                    reference: e.target.value || null,
                                                                                })
                                                                            }
                                                                            className="input"
                                                                            placeholder="Ex: 62000PRG"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="label">Estoque mínimo</label>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={sku.min_stock ?? 0}
                                                                            onChange={(e) =>
                                                                                updateVariation(sku, {
                                                                                    // Inteiro: normaliza (trata virgula) e arredonda.
                                                                                    min_stock: Math.round(
                                                                                        parseDecimal(e.target.value) ?? 0,
                                                                                    ),
                                                                                })
                                                                            }
                                                                            className="input"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* estoque somente-leitura */}
                                                                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                                                                    <div>
                                                                        <p className="text-xs font-medium text-gray-500">
                                                                            Estoque
                                                                        </p>
                                                                        <p className="text-[11px] text-gray-400">
                                                                            Somente leitura · fonte: StockHub
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-lg font-bold text-gray-700">
                                                                        {sku.stock_qty}
                                                                    </span>
                                                                </div>

                                                                {/* promoção da variação */}
                                                                <div className="rounded-lg border border-gray-100 p-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <Percent
                                                                                size={14}
                                                                                className="text-gray-400"
                                                                            />
                                                                            <p className="text-sm font-medium text-gray-700">
                                                                                Preço em promoção
                                                                            </p>
                                                                        </div>
                                                                        <ToggleSwitch
                                                                            checked={varPromoOn}
                                                                            onChange={() =>
                                                                                updateVariation(sku, {
                                                                                    sale_price: varPromoOn
                                                                                        ? null
                                                                                        : sku.price ?? editing.base_price,
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {varPromoOn && (
                                                                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                                                                            <div>
                                                                                <label className="label">
                                                                                    Preço promocional (R$)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                    value={sku.sale_price ?? ""}
                                                                                    onChange={(e) =>
                                                                                        updateVariation(sku, {
                                                                                            sale_price: parseDecimal(
                                                                                                e.target.value,
                                                                                            ),
                                                                                        })
                                                                                    }
                                                                                    className="input"
                                                                                />
                                                                                {skuPct != null && (
                                                                                    <p className="mt-1 text-xs font-semibold text-green-600">
                                                                                        {skuPct}% off
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <label className="label">
                                                                                    Data inicial
                                                                                </label>
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={toLocalInput(sku.sale_start)}
                                                                                    onChange={(e) =>
                                                                                        updateVariation(sku, {
                                                                                            sale_start: fromLocalInput(
                                                                                                e.target.value,
                                                                                            ),
                                                                                        })
                                                                                    }
                                                                                    className="input"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="label">Data final</label>
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={toLocalInput(sku.sale_end)}
                                                                                    onChange={(e) =>
                                                                                        updateVariation(sku, {
                                                                                            sale_end: fromLocalInput(
                                                                                                e.target.value,
                                                                                            ),
                                                                                        })
                                                                                    }
                                                                                    className="input"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* adicionar variação avulsa */}
                            <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                                <div>
                                    <label className="label">Cor</label>
                                    <select
                                        value={addColor}
                                        onChange={(e) => setAddColor(e.target.value)}
                                        className="input"
                                    >
                                        <option value="">— Cor —</option>
                                        {colors.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Tamanho</label>
                                    <select
                                        value={addSize}
                                        onChange={(e) => setAddSize(e.target.value)}
                                        className="input"
                                    >
                                        <option value="">— Tam —</option>
                                        {sizes.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        addVariation(addColor, addSize);
                                        setAddColor("");
                                        setAddSize("");
                                    }}
                                    disabled={!addColor || !addSize}
                                    className="flex items-center gap-1.5 rounded-lg border border-[#8C2F39] px-4 py-2 text-sm font-medium text-[#8C2F39] hover:bg-red-50/40 disabled:opacity-40"
                                >
                                    <Plus size={15} /> Adicionar variação
                                </button>
                            </div>
                        </section>
                    )}

                    {/* ── PESO E DIMENSÕES (só no pai) ── */}
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
                                            weight_kg: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder="0.300"
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
                                            pkg_height_cm: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder="5"
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
                                            pkg_width_cm: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder="15"
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
                                            pkg_length_cm: parseDecimal(e.target.value),
                                        })
                                    }
                                    className="input"
                                    placeholder="20"
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
                                    Desativado = fora do catálogo por completo.
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={editing.active}
                                onChange={() =>
                                    setEditing({ ...editing, active: !editing.active })
                                }
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">
                                    Exibir na loja virtual
                                </p>
                                <p className="text-xs text-gray-400">
                                    Esgotou? Tire da loja sem desativar o produto.
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={editing.visible_in_store}
                                onChange={() =>
                                    setEditing({
                                        ...editing,
                                        visible_in_store: !editing.visible_in_store,
                                    })
                                }
                            />
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
                                    const filhoId = e.target.value || null;
                                    setSelectedCategoryFilhoId(filhoId);
                                    // Se a subcategoria NÃO tem netos, ela É a folha: grava
                                    // category_id = filho (categoria completa em 2 níveis).
                                    // Se tem netos, zera pra exigir a específica (3º nível).
                                    const filho = categoryTree
                                        .find((p) => p.id === selectedCategoryPaiId)
                                        ?.children.find((f) => f.id === filhoId);
                                    const temNetos = (filho?.children?.length ?? 0) > 0;
                                    setEditing({
                                        ...editing,
                                        category_id: temNetos ? null : filhoId,
                                    });
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

                            {/* 3º nível ("Específica") só aparece/é exigido quando a
                                subcategoria escolhida TEM netos (ex.: Plus Size). Sem
                                netos (ex.: Camisola), a categoria está completa em 2 níveis. */}
                            {(() => {
                                const netos =
                                    categoryTree
                                        .find((p) => p.id === selectedCategoryPaiId)
                                        ?.children.find((f) => f.id === selectedCategoryFilhoId)
                                        ?.children ?? [];
                                if (netos.length === 0) return null;
                                return (
                                    <select
                                        value={editing.category_id || ""}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                category_id: e.target.value || null,
                                            })
                                        }
                                        className="input"
                                    >
                                        <option value="">— Específica —</option>
                                        {netos.map((neto) => (
                                            <option key={neto.id} value={neto.id}>
                                                {neto.name}
                                            </option>
                                        ))}
                                    </select>
                                );
                            })()}

                            {/* Marcadores como "3º nível" visual da categoria (Feminino →
                                Camisola → Mais Vendidos). Independentes: dá pra marcar mais
                                de um. Ficam abaixo da subcategoria/específica. */}
                            <div className="mt-2 space-y-3 border-t border-gray-100 pt-3">
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
                        </div>
                    </section>

                    {/* ── TABELA DE MEDIDAS HERDADA (só leitura) ── */}
                    <SizeChartPreview
                        categorySlugs={categorySlugs}
                        sizes={sizes}
                        ownChart={editing.size_chart}
                    />

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
                    onClick={cancel}
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
                                Adicionar: Tamanho
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
                                            placeholder="Nome do tamanho"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-5 py-2">
                                    {sizeList.length === 0 ? (
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
                                    {sizes.length === 0 ? (
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
