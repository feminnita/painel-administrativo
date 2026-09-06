import {
    Copy,
    ExternalLink,
    MessageCircle,
    Package,
    Printer,
    RefreshCw,
    Truck,
    X,
} from "lucide-react";
import type { useOrdersAdmin } from "../useOrdersAdmin";
import {
    derivePaymentStatus,
    fmtBRL,
    isPickupOrder,
    PAYMENT_LABELS,
    PAYMENT_STATUS_META,
    STATUS_OPTIONS,
    timelineStep,
    TIMELINE_STEPS,
} from "../domain";

type OrdersVM = ReturnType<typeof useOrdersAdmin>;

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch((error) => {
        console.error("Failed to copy text: ", error);
    });
}

export function OrderDetail({ vm }: { vm: OrdersVM }) {
    const {
        selected,
        select,
        changeStatus,
        trackingInput,
        setTrackingInput,
        saveTracking,
        savingTracking,
        buyLabel,
        buyingLabel,
        refreshTracking,
        refreshingTracking,
    } = vm;

    if (!selected) return null;

    const pickup = isPickupOrder(selected);

    const canBuyLabel =
        !pickup &&
        !selected.label_url &&
        ["paid", "confirmed", "processing"].includes(selected.status);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:sticky lg:top-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h3 className="text-lg font-bold">
                        Pedido {selected.order_number}
                    </h3>
                    <p className="text-xs text-gray-400">
                        {new Date(selected.created_at).toLocaleString("pt-BR")}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => select(null)}
                        className="rounded-lg border p-2 hover:bg-gray-50"
                    >
                        <X size={15} className="text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto p-6">
                {/* Retirada na fábrica: aviso forte para não despachar por engano */}
                {pickup && (
                    <div className="flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-bold uppercase tracking-wide text-amber-700">
                        <Package size={16} /> Retirada na fábrica — não despachar
                    </div>
                )}

                {/* Timeline */}
                <div>
                    <div className="flex items-center justify-between">
                        {TIMELINE_STEPS.map((step, i) => {
                            const step_n = i + 1;
                            const current = timelineStep(selected.status);
                            const done = current >= step_n;
                            return (
                                <div
                                    key={step.key}
                                    className="relative flex flex-1 flex-col items-center"
                                >
                                    {i < TIMELINE_STEPS.length - 1 && (
                                        <div
                                            className={`absolute left-1/2 top-3 h-0.5 w-full ${done && current > step_n ? "bg-[#8C2F39]" : "bg-gray-200"}`}
                                        />
                                    )}
                                    <div
                                        className={`z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done
                                            ? "bg-[#8C2F39] text-white"
                                            : "bg-gray-200 text-gray-400"
                                            }`}
                                    >
                                        {done ? "✓" : step_n}
                                    </div>
                                    <p className="mt-1 text-center text-[10px] leading-tight text-gray-500">
                                        {step.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Status */}
                <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                        Status do pedido
                    </p>
                    <select
                        value={selected.status}
                        onChange={(e) => changeStatus(selected.id, e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8C2F39]"
                    >
                        {Object.entries(STATUS_OPTIONS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Customer */}
                <div className="border-t pt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                        Cliente
                    </p>
                    <p className="text-sm font-semibold">{selected.customer_name}</p>
                    <p className="text-xs text-gray-500">{selected.customer_email}</p>
                    {selected.customer_cpf && (
                        <p className="text-xs text-gray-500">
                            CPF: {selected.customer_cpf}
                        </p>
                    )}
                    {selected.customer_phone && (
                        <div className="mt-1.5 flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                                {selected.customer_phone}
                            </p>
                            <a
                                href={`https://wa.me/55${selected.customer_phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                            >
                                <MessageCircle size={11} />
                                WhatsApp
                            </a>
                        </div>
                    )}
                </div>

                {/* Items */}
                {selected.items?.length > 0 && (
                    <div className="border-t pt-4">
                        <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                            Produtos ({selected.items.length})
                        </p>
                        <div className="space-y-3">
                            {selected.items.map((item, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                        {item.product_image ? (
                                            <img
                                                src={item.product_image}
                                                alt={item.product_name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Package size={16} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-xs font-medium">
                                            {item.product_name}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap gap-x-2">
                                            {item.color && (
                                                <p className="text-xs text-gray-400">
                                                    Cor: {item.color}
                                                </p>
                                            )}
                                            {item.size && (
                                                <p className="text-xs text-gray-400">
                                                    Tam: {item.size}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <p className="text-xs text-gray-500">
                                                {item.quantity}× R$ {fmtBRL(item.unit_price)}
                                            </p>
                                            <p className="text-xs font-bold">
                                                R$ {fmtBRL(item.total_price)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5 border-t pt-4 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>R$ {fmtBRL(selected.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>
                            Frete{" "}
                            {selected.shipping_method
                                ? `(${selected.shipping_method})`
                                : ""}
                        </span>
                        <span>R$ {fmtBRL(selected.shipping_cost)}</span>
                    </div>
                    {selected.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Desconto</span>
                            <span>- R$ {fmtBRL(selected.discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span>Total</span>
                        <span className="text-[#8C2F39]">
                            R$ {fmtBRL(selected.total)}
                        </span>
                    </div>
                </div>

                {/* Payment */}
                <div className="border-t pt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                        Pagamento
                    </p>
                    <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Forma</span>
                            <span className="font-medium">
                                {PAYMENT_LABELS[selected.payment_method || ""] ||
                                    selected.payment_method ||
                                    "—"}
                            </span>
                        </div>
                        {selected.installments && selected.installments > 1 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Parcelas</span>
                                <span className="font-medium">
                                    {selected.installments}× de R${" "}
                                    {fmtBRL(selected.total / selected.installments)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_META[derivePaymentStatus(selected)].color}`}
                            >
                                {PAYMENT_STATUS_META[derivePaymentStatus(selected)].label}
                            </span>
                        </div>
                        {selected.asaas_payment_id && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Transação</span>
                                <span className="max-w-[140px] truncate font-mono text-gray-600">
                                    {selected.asaas_payment_id}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shipping address */}
                {selected.shipping_address && (
                    <div className="border-t pt-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                Endereço de entrega
                            </p>
                            <button
                                onClick={() => {
                                    const a = selected.shipping_address;
                                    if (!a) return;
                                    copyToClipboard(
                                        `${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ""} - ${a.neighborhood}, ${a.city}/${a.state} - CEP ${a.cep}`,
                                    );
                                }}
                                className="flex items-center gap-1 text-xs text-[#8C2F39] hover:underline"
                            >
                                <Copy size={11} /> Copiar
                            </button>
                        </div>
                        <p className="text-xs leading-5 text-gray-600">
                            {selected.shipping_address.street},{" "}
                            {selected.shipping_address.number}
                            {selected.shipping_address.complement
                                ? `, ${selected.shipping_address.complement}`
                                : ""}
                            <br />
                            {selected.shipping_address.neighborhood} —{" "}
                            {selected.shipping_address.city}/{selected.shipping_address.state}
                            <br />
                            CEP: {selected.shipping_address.cep}
                        </p>
                    </div>
                )}

                {/* Etiqueta e rastreio */}
                <div className="border-t pt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                        Etiqueta e rastreio
                    </p>

                    {pickup ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Pedido de retirada na fábrica: não gera etiqueta nem
                            rastreio. O cliente retira no endereço configurado.
                        </p>
                    ) : (
                        <>
                    {canBuyLabel && (
                        <button
                            onClick={buyLabel}
                            disabled={buyingLabel}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white hover:bg-[#7a2832] disabled:opacity-50"
                        >
                            <Truck size={14} />
                            {buyingLabel ? "Comprando etiqueta..." : "Comprar etiqueta (Melhor Envio)"}
                        </button>
                    )}

                    {selected.tracking_code ? (
                        <div className="flex items-center gap-2">
                            <span className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm">
                                {selected.tracking_code}
                            </span>
                            <button
                                onClick={() => copyToClipboard(selected.tracking_code!)}
                                className="rounded-lg border p-2 hover:bg-gray-50"
                            >
                                <Copy size={13} className="text-gray-400" />
                            </button>
                            {selected.tracking_url && (
                                <a
                                    href={selected.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg border p-2 hover:bg-gray-50"
                                >
                                    <ExternalLink size={13} className="text-gray-400" />
                                </a>
                            )}
                        </div>
                    ) : selected.label_url ? (
                        <button
                            onClick={refreshTracking}
                            disabled={refreshingTracking}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={14}
                                className={refreshingTracking ? "animate-spin" : ""}
                            />
                            {refreshingTracking
                                ? "Consultando..."
                                : "Buscar código no Melhor Envio"}
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={trackingInput}
                                onChange={(e) =>
                                    setTrackingInput(e.target.value.toUpperCase())
                                }
                                placeholder="Ex: BR123456789BR"
                                className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-[#8C2F39]"
                            />
                            <button
                                onClick={saveTracking}
                                disabled={savingTracking || !trackingInput.trim()}
                                className="rounded-lg bg-[#8C2F39] px-3 py-2 text-sm text-white hover:bg-[#7a2832] disabled:opacity-50"
                            >
                                {savingTracking ? "..." : "Salvar"}
                            </button>
                        </div>
                    )}

                    {selected.label_url && (
                        <a
                            href={selected.label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                        >
                            <Printer size={12} /> Imprimir etiqueta
                        </a>
                    )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
