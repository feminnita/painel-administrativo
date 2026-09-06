import { memo } from "react";
import {
    ChevronDown,
    ArrowUp,
    ArrowDown,
    EyeOff,
    Eye,
    Trash2,
    Plus,
} from "lucide-react";
import type { Sku } from "../types";

type VariationCardProps = {
    sku: Sku;
    index: number;
    expanded: boolean;
    isLast: boolean;
    basePrice: number;
    colorImgs: string[];
    uploading: boolean;
    onToggle: (index: number) => void;
    setSku: (index: number, patch: Partial<Sku>) => void;
    deleteSku: (index: number) => void;
    toggleSkuActive: (index: number) => void;
    reorderSku: (index: number, dir: "up" | "down") => void;
    uploadColorImages: (color: string, files: FileList) => void;
    removeColorImage: (color: string, url: string) => void;
};

function VariationCardBase({
    sku,
    index,
    expanded,
    isLast,
    basePrice,
    colorImgs,
    uploading,
    onToggle,
    setSku,
    deleteSku,
    toggleSkuActive,
    reorderSku,
    uploadColorImages,
    removeColorImage,
}: VariationCardProps) {
    const promoBase = sku.price ?? basePrice;
    const discount =
        sku.sale_price && promoBase
            ? Math.round((1 - sku.sale_price / promoBase) * 100)
            : null;
    const isOpen = expanded;

    return (
        <div className="rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    type="button"
                    onClick={() => onToggle(index)}
                    className="flex flex-1 cursor-pointer list-none items-center gap-3 text-left"
                >
                    <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                    <span className="font-medium text-gray-700">
                        Código: {sku.reference || "—"} · {sku.color} ·{" "}
                        {sku.size}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Estoque: {sku.stock_qty}
                    </span>
                    {!sku.active && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                            Inativa
                        </span>
                    )}
                </button>
                <span className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => reorderSku(index, "up")}
                        disabled={index === 0}
                        className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                        title="Mover para cima"
                    >
                        <ArrowUp size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => reorderSku(index, "down")}
                        disabled={isLast}
                        className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                        title="Mover para baixo"
                    >
                        <ArrowDown size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleSkuActive(index)}
                        className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                        title={sku.active ? "Inativar" : "Ativar"}
                    >
                        {sku.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => deleteSku(index)}
                        className="rounded-md border border-gray-200 p-1.5 text-red-500 hover:bg-red-50"
                        title="Excluir variação"
                    >
                        <Trash2 size={14} />
                    </button>
                </span>
            </div>
            {isOpen && (
                <div className="border-t border-gray-100 p-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="label">Preço de venda (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sku.price ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        price: Number.parseFloat(e.target.value) || null,
                                    })
                                }
                                className="input"
                                placeholder={`${basePrice.toFixed(2)} (herda)`}
                            />
                        </div>
                        <div>
                            <label className="label">Referência</label>
                            <input
                                type="text"
                                value={sku.reference ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        reference: e.target.value || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Estoque</label>
                            <input
                                type="number"
                                min="0"
                                value={sku.stock_qty}
                                onChange={(e) =>
                                    setSku(index, {
                                        stock_qty: Number.parseInt(e.target.value) || 0,
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
                                value={sku.cost_price ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        cost_price:
                                            Number.parseFloat(e.target.value) || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">EAN / GTIN</label>
                            <input
                                type="text"
                                value={sku.ean ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        ean: e.target.value || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Estoque mínimo</label>
                            <input
                                type="number"
                                min="0"
                                value={sku.min_stock ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        min_stock: Number.parseInt(e.target.value) || 0,
                                    })
                                }
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="label">Prazo de disponibilidade</label>
                            <select
                                value={sku.availability ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        availability: e.target.value || null,
                                    })
                                }
                                className="input"
                            >
                                <option value="">— Herdar —</option>
                                <option value="Pronta entrega">Pronta entrega</option>
                                <option value="Sob encomenda">Sob encomenda</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Quando acabar o estoque</label>
                            <select
                                value={sku.out_of_stock_action ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        out_of_stock_action: e.target.value || null,
                                    })
                                }
                                className="input"
                            >
                                <option value="">— Herdar —</option>
                                <option value="Ocultar produto">Ocultar produto</option>
                                <option value="Continuar vendendo">
                                    Continuar vendendo
                                </option>
                            </select>
                            <p className="mt-1 text-xs text-gray-400">
                                A variação herdará o comportamento do produto principal
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Promoção
                        </p>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="label">Preço promocional (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={sku.sale_price ?? ""}
                                    onChange={(e) =>
                                        setSku(index, {
                                            sale_price:
                                                Number.parseFloat(e.target.value) || null,
                                        })
                                    }
                                    className="input"
                                />
                                {discount != null && (
                                    <p className="mt-1 text-xs text-[#8C2F39]">
                                        {discount}% de desconto
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">Início</label>
                                <input
                                    type="date"
                                    value={sku.sale_start ?? ""}
                                    onChange={(e) =>
                                        setSku(index, {
                                            sale_start: e.target.value || null,
                                        })
                                    }
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Fim</label>
                                <input
                                    type="date"
                                    value={sku.sale_end ?? ""}
                                    onChange={(e) =>
                                        setSku(index, {
                                            sale_end: e.target.value || null,
                                        })
                                    }
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <label className="label">Peso (gr)</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={sku.weight_g ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        weight_g: Number.parseInt(e.target.value) || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Altura (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sku.height_cm ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        height_cm:
                                            Number.parseFloat(e.target.value) || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Largura (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sku.width_cm ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        width_cm:
                                            Number.parseFloat(e.target.value) || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Comprimento (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sku.length_cm ?? ""}
                                onChange={(e) =>
                                    setSku(index, {
                                        length_cm:
                                            Number.parseFloat(e.target.value) || null,
                                    })
                                }
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Galeria de imagens da variação ({sku.color})
                        </p>
                        <div className="flex flex-wrap gap-2">
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
                                    {i === 0 && (
                                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                                            Principal
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeColorImage(sku.color, url)}
                                        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <label
                                className={`flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-gray-400 transition-colors ${uploading
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
                                        uploadColorImages(sku.color, e.target.files)
                                    }
                                />
                                <Plus size={16} />
                                <span className="text-[9px]">Adicionar</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export const VariationCard = memo(VariationCardBase);
