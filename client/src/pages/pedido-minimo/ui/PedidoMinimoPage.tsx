import { Save, ShoppingBag } from "lucide-react";
import { usePedidoMinimoAdmin } from "../usePedidoMinimoAdmin";

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

export function PedidoMinimoPage() {
    const { config, setConfig, loading, saving, saved, handleSave } =
        usePedidoMinimoAdmin();

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <ShoppingBag size={26} /> Pedido mínimo
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Valor mínimo de produtos para o cliente finalizar a compra
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 text-sm font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                >
                    <Save size={15} />
                    {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar"}
                </button>
            </div>

            <div className="max-w-xl space-y-6">
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-700">
                                Exigir pedido mínimo
                            </p>
                            <p className="text-xs text-gray-400">
                                Quando ligado, o carrinho mostra a barra de progresso e
                                bloqueia o checkout abaixo do valor. Desligado, a compra
                                é liberada em qualquer valor.
                            </p>
                        </div>
                        <ToggleSwitch
                            checked={config.ativo}
                            onChange={() =>
                                setConfig({ ...config, ativo: !config.ativo })
                            }
                        />
                    </div>

                    {config.ativo && (
                        <div className="mt-4 border-t pt-4">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Valor mínimo do pedido (R$)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={config.valor}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        valor: Math.max(
                                            Number.parseFloat(e.target.value) || 0,
                                            0,
                                        ),
                                    })
                                }
                                className="w-40 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                placeholder="199"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Ex.: 199 = o cliente precisa de ao menos R$ 199,00 em
                                produtos (sem frete) para finalizar.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
