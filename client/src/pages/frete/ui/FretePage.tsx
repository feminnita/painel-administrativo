import { Save, Truck } from "lucide-react";
import { parseDecimal } from "@/lib/parseDecimal";
import { useFreteAdmin } from "../useFreteAdmin";

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

export function FretePage() {
    const { config, setConfig, loading, saving, saved, handleSave } =
        useFreteAdmin();

    const freeEnabled = config.freeShipingThreshold !== null;

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <Truck size={26} /> Frete
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Regras aplicadas em cima da cotação do Melhor Envio
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
                {/* Frete grátis */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-700">
                                Frete grátis por valor de compra
                            </p>
                            <p className="text-xs text-gray-400">
                                A opção de entrega mais barata sai de graça quando o
                                carrinho atinge o valor mínimo. As opções expressas
                                continuam pagas.
                            </p>
                        </div>
                        <ToggleSwitch
                            checked={freeEnabled}
                            onChange={() =>
                                setConfig({
                                    ...config,
                                    freeShipingThreshold: freeEnabled ? null : 199,
                                })
                            }
                        />
                    </div>

                    {freeEnabled && (
                        <div className="mt-4 border-t pt-4">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Valor mínimo do carrinho (R$)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={config.freeShipingThreshold ?? ""}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        freeShipingThreshold:
                                            parseDecimal(e.target.value),
                                    })
                                }
                                className="w-40 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                placeholder="199"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Ex.: 199 = frete grátis em compras a partir de R$ 199,00
                            </p>
                        </div>
                    )}
                </section>

                {/* Prazo extra */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700">
                        Prazo extra de preparo (dias)
                    </p>
                    <p className="mb-4 text-xs text-gray-400">
                        Dias somados ao prazo da transportadora em todas as opções —
                        o tempo de separar e embalar o pedido.
                    </p>
                    <input
                        type="number"
                        min="0"
                        max="15"
                        value={config.extraDays}
                        onChange={(e) =>
                            setConfig({
                                ...config,
                                extraDays: Math.max(
                                    Number.parseInt(e.target.value) || 0,
                                    0,
                                ),
                            })
                        }
                        className="w-40 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                    />
                </section>

                {/* Retirada na fábrica */}
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-700">
                                Retirada na fábrica
                            </p>
                            <p className="text-xs text-gray-400">
                                Mostra no checkout uma opção de retirada com custo R$
                                0,00, para qualquer CEP, junto das cotações de
                                transportadora. O pedido sai marcado como RETIRADA e
                                não gera etiqueta.
                            </p>
                        </div>
                        <ToggleSwitch
                            checked={config.pickup.enabled}
                            onChange={() =>
                                setConfig({
                                    ...config,
                                    pickup: {
                                        ...config.pickup,
                                        enabled: !config.pickup.enabled,
                                    },
                                })
                            }
                        />
                    </div>

                    {config.pickup.enabled && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Endereço de retirada
                                </label>
                                <input
                                    type="text"
                                    value={config.pickup.address}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            pickup: {
                                                ...config.pickup,
                                                address: e.target.value,
                                            },
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                    placeholder="Rua, número, bairro, cidade/UF"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Horário de funcionamento
                                </label>
                                <input
                                    type="text"
                                    value={config.pickup.hours}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            pickup: {
                                                ...config.pickup,
                                                hours: e.target.value,
                                            },
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                    placeholder="Seg a Sex, 8h às 18h"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Observação (opcional)
                                </label>
                                <textarea
                                    value={config.pickup.note}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            pickup: {
                                                ...config.pickup,
                                                note: e.target.value,
                                            },
                                        })
                                    }
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                                    placeholder="Ex.: Avise pelo WhatsApp antes de vir buscar."
                                />
                            </div>
                        </div>
                    )}
                </section>

                <p className="text-xs text-gray-400">
                    O CEP de origem e o token do Melhor Envio são configurados no
                    servidor (variáveis de ambiente), não aqui.
                </p>
            </div>
        </div>
    );
}