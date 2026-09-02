import { useParams, Link } from "react-router-dom";
import {
    Copy,
    ExternalLink,
    FileText,
    Loader2,
    MessageCircle,
    Package,
    Printer,
    RefreshCw,
    Send,
    Truck,
    X,
} from "lucide-react";
import { useOrderDetail } from "../useOrderDetail";
import {
    derivedTimelineStep,
    displayStatus,
    fmtBRL,
    isSandboxLabel,
    OVERRIDE_OPTIONS,
    PAYMENT_LABELS,
    TIMELINE_STEPS,
} from "../domain";
import type { OverrideValue } from "../types";
import { OrderSheet, PrintPortal, RomaneioSheet } from "./PrintSheets";

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch((e) => console.error("Falha ao copiar:", e));
}

function fmtDate(v: string | null): string {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

const SOURCE_LABELS: Record<string, string> = {
    admin: "Painel (manual)",
    asaas: "Asaas",
    bling: "Bling",
    "melhor-envio": "Melhor Envio",
};

const HISTORY_STATUS_LABELS: Record<string, string> = {
    auto: "Automático (derivado)",
    em_separacao: "Em separação",
    aguardando_estoque: "Aguardando estoque",
    cancelado: "Cancelado",
};

function histLabel(v: string | null): string {
    if (!v) return "—";
    return HISTORY_STATUS_LABELS[v] ?? v;
}

export function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const vm = useOrderDetail(id);
    const {
        order,
        loading,
        notFound,
        trackingInput,
        setTrackingInput,
        saveTracking,
        savingTracking,
        buyLabel,
        buyingLabel,
        refreshTracking,
        refreshingTracking,
        pushToBling,
        pushingBling,
        savingOverride,
        setStatusOverride,
    } = vm;

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="p-10 text-center text-gray-500">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Pedido não encontrado.</p>
                <Link to="/pedidos" className="mt-3 inline-block text-[#8C2F39] hover:underline">
                    Voltar para a lista
                </Link>
            </div>
        );
    }

    const disp = displayStatus(order);
    const step = derivedTimelineStep(order);
    const phone = (order.customer_phone || "").replace(/\D/g, "");
    const canBuyLabel = !order.label_url && order.payment_status === "paid";
    const labelHref = order.label_url && !isSandboxLabel(order.label_url) ? order.label_url : null;
    const a = order.shipping_address;

    return (
        <div className="min-h-full bg-gray-100 pb-16">
            {/* Header / barra de acoes */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-3 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Pedido {order.order_number}</h1>
                    <p className="text-xs text-gray-400">
                        {fmtDate(order.created_at)} • Canal: Site
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {phone && (
                        <a
                            href={`https://wa.me/55${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp do cliente"
                            className="rounded-lg bg-green-500 p-2 text-white hover:bg-green-600"
                        >
                            <MessageCircle size={16} />
                        </a>
                    )}
                    <a
                        href="#envio"
                        title="Ir para envio"
                        className="rounded-lg border p-2 text-indigo-600 hover:bg-indigo-50"
                    >
                        <Truck size={16} />
                    </a>
                    {!order.bling_order_id && (
                        <button
                            onClick={pushToBling}
                            disabled={pushingBling}
                            title="Enviar ao Bling"
                            className="rounded-lg border border-[#8C2F39] p-2 text-[#8C2F39] hover:bg-rose-50 disabled:opacity-50"
                        >
                            {pushingBling ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        title="Imprimir pedido / romaneio"
                        className="rounded-lg bg-[#8C2F39] p-2 text-white hover:bg-[#7a2832]"
                    >
                        <Printer size={16} />
                    </button>
                    <Link
                        to="/pedidos"
                        title="Voltar à lista"
                        className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50"
                    >
                        <X size={16} />
                    </Link>
                </div>
            </div>

            <div className="p-6">
                {/* Stepper + override */}
                <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center justify-between">
                            {TIMELINE_STEPS.map((s, i) => {
                                const n = i + 1;
                                const done = step >= n;
                                return (
                                    <div key={s.key} className="relative flex flex-1 flex-col items-center">
                                        {i < TIMELINE_STEPS.length - 1 && (
                                            <div
                                                className={`absolute left-1/2 top-3 h-0.5 w-full ${done && step > n ? "bg-[#8C2F39]" : "bg-gray-200"}`}
                                            />
                                        )}
                                        <div
                                            className={`z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-[#8C2F39] text-white" : "bg-gray-200 text-gray-400"}`}
                                        >
                                            {done ? "✓" : n}
                                        </div>
                                        <p className="mt-1 text-center text-[11px] leading-tight text-gray-600">
                                            {s.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="shrink-0 lg:w-64">
                            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                                Status do pedido{" "}
                                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${disp.color}`}>
                                    {disp.label}
                                </span>
                            </p>
                            <select
                                value={order.status_override ?? ""}
                                disabled={savingOverride}
                                onChange={(e) =>
                                    setStatusOverride((e.target.value || null) as OverrideValue | null)
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#8C2F39] disabled:opacity-50"
                            >
                                <option value="">Automático (derivado)</option>
                                {OVERRIDE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label} (sobrescrita)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Coluna principal */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Cliente */}
                        <Card title="Cliente">
                            <p className="text-sm font-semibold">{order.customer_name}</p>
                            {order.customer_cpf && (
                                <p className="text-xs text-gray-500">CPF: {order.customer_cpf}</p>
                            )}
                            <p className="text-xs text-gray-500">{order.customer_email || "—"}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                {order.customer_phone && (
                                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                                )}
                                {phone && (
                                    <a
                                        href={`https://wa.me/55${phone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 rounded-lg bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                                    >
                                        <MessageCircle size={11} /> WhatsApp
                                    </a>
                                )}
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">Termo aceito em: —</p>
                        </Card>

                        {/* Resumo do pedido */}
                        <Card title={`Resumo do pedido (${order.items.length})`}>
                            <div className="space-y-3">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
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
                                            <p className="text-sm font-medium">{item.product_name}</p>
                                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                                                <span>Cor: {item.color || "—"}</span>
                                                <span>Tam: {item.size || "—"}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-xs">
                                                <span className="text-gray-500">
                                                    {item.quantity}× R$ {fmtBRL(item.unit_price)}
                                                </span>
                                                <span className="font-bold">R$ {fmtBRL(item.total_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Dados fiscais */}
                        <Card title="Dados fiscais (Nota)">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <Field label="Situação" value={order.nfe_status || "—"} />
                                <Field label="Número da nota" value={order.nfe_number || "—"} />
                                <Field label="Data de emissão" value="—" />
                                <Field label="Série" value="—" />
                                <div className="col-span-2">
                                    <dt className="text-gray-400">Chave da nota (44 díg)</dt>
                                    <dd className="break-all font-mono text-gray-700">
                                        {order.nfe_key || "—"}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-3 flex flex-wrap gap-3">
                                {order.nfe_xml_url && (
                                    <a
                                        href={order.nfe_xml_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                    >
                                        <ExternalLink size={12} /> Acessar Nota Fiscal
                                    </a>
                                )}
                                {order.nfe_pdf_url && (
                                    <a
                                        href={order.nfe_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                    >
                                        <FileText size={12} /> Download DANFE/XML
                                    </a>
                                )}
                                {!order.nfe_number && (
                                    <span className="text-xs text-gray-400">Nota ainda não emitida.</span>
                                )}
                            </div>
                        </Card>

                        {/* Observacoes internas */}
                        <Card title="Observações internas">
                            <p className="whitespace-pre-wrap text-sm text-gray-600">
                                {order.notes || "—"}
                            </p>
                        </Card>

                        {/* Historico */}
                        <Card title="Histórico de status">
                            {order.status_history.length === 0 ? (
                                <p className="text-sm text-gray-400">Nenhuma alteração registrada.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {order.status_history.map((h) => (
                                        <li
                                            key={h.id}
                                            className="flex items-start justify-between gap-3 border-b border-gray-50 pb-2 text-xs last:border-0"
                                        >
                                            <div>
                                                <span className="font-medium text-gray-700">
                                                    {histLabel(h.from_status)} → {histLabel(h.to_status)}
                                                </span>
                                                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                                    {SOURCE_LABELS[h.source] ?? h.source}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-gray-400">{fmtDate(h.created_at)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* Coluna direita */}
                    <div className="space-y-6">
                        {/* Pagamento */}
                        <Card title="Dados do pagamento">
                            <dl className="space-y-1.5 text-xs">
                                <RowKV label="Transação" value={order.asaas_payment_id || "—"} mono />
                                <RowKV
                                    label="Forma"
                                    value={
                                        PAYMENT_LABELS[order.payment_method || ""] ||
                                        order.payment_method ||
                                        "—"
                                    }
                                />
                                <RowKV
                                    label="Valor pago"
                                    value={
                                        order.installments && order.installments > 1
                                            ? `R$ ${fmtBRL(order.total)} (${order.installments}x de R$ ${fmtBRL(order.total / order.installments)})`
                                            : `R$ ${fmtBRL(order.total)}`
                                    }
                                />
                                <RowKV label="Tarifa de pagamento" value="—" />
                                <RowKV label="Valor a receber" value="—" />
                            </dl>
                        </Card>

                        {/* Envio */}
                        <div id="envio">
                            <Card title="Informações do envio">
                                {a ? (
                                    <div className="mb-3">
                                        <div className="mb-1 flex items-center justify-between">
                                            <p className="text-xs font-semibold text-gray-600">Destinatário</p>
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        `${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ""} - ${a.neighborhood}, ${a.city}/${a.state} - CEP ${a.cep}`,
                                                    )
                                                }
                                                className="flex items-center gap-1 text-xs text-[#8C2F39] hover:underline"
                                            >
                                                <Copy size={11} /> Copiar
                                            </button>
                                        </div>
                                        <p className="text-xs leading-5 text-gray-600">
                                            {order.customer_name}
                                            <br />
                                            {a.street}, {a.number}
                                            {a.complement ? `, ${a.complement}` : ""}
                                            <br />
                                            {a.neighborhood} — {a.city}/{a.state}
                                            <br />
                                            CEP: {a.cep}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mb-3 text-xs text-gray-400">Sem endereço de entrega.</p>
                                )}

                                <div className="mb-3 rounded-lg bg-gray-50 p-2 text-xs">
                                    <RowKV label="Forma de envio" value={order.shipping_method || "—"} />
                                    <RowKV label="Frete" value={`R$ ${fmtBRL(order.shipping_cost)}`} />
                                    <RowKV label="Prazo" value="—" />
                                </div>

                                {/* Acoes de envio (icone caminhao) */}
                                {canBuyLabel && (
                                    <button
                                        onClick={buyLabel}
                                        disabled={buyingLabel}
                                        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white hover:bg-[#7a2832] disabled:opacity-50"
                                    >
                                        <Truck size={14} />
                                        {buyingLabel ? "Comprando etiqueta..." : "Gerar etiqueta (Melhor Envio)"}
                                    </button>
                                )}

                                {order.tracking_code ? (
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm">
                                            {order.tracking_code}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(order.tracking_code!)}
                                            className="rounded-lg border p-2 hover:bg-gray-50"
                                        >
                                            <Copy size={13} className="text-gray-400" />
                                        </button>
                                        {order.tracking_url && (
                                            <a
                                                href={order.tracking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-lg border p-2 hover:bg-gray-50"
                                            >
                                                <ExternalLink size={13} className="text-gray-400" />
                                            </a>
                                        )}
                                    </div>
                                ) : order.label_url ? (
                                    <button
                                        onClick={refreshTracking}
                                        disabled={refreshingTracking}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={refreshingTracking ? "animate-spin" : ""} />
                                        {refreshingTracking ? "Consultando..." : "Buscar código no Melhor Envio"}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={trackingInput}
                                            onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                                            placeholder="Adicionar código de rastreio"
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

                                {labelHref && (
                                    <a
                                        href={labelHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                                    >
                                        <Printer size={12} /> Ver etiqueta
                                    </a>
                                )}
                            </Card>
                        </div>

                        {/* Totais */}
                        <Card title="Totais">
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal ({order.items.length})</span>
                                    <span>R$ {fmtBRL(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Frete</span>
                                    <span>R$ {fmtBRL(order.shipping_cost)}</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>
                                            Cupom{order.coupon_code ? ` (${order.coupon_code})` : ""}
                                        </span>
                                        <span>- R$ {fmtBRL(order.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-2 text-base font-bold">
                                    <span>Total do pedido</span>
                                    <span className="text-[#8C2F39]">R$ {fmtBRL(order.total)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Versao de impressao (limpa) desta pagina */}
            <PrintPortal>
                <RomaneioSheet order={order} />
                <OrderSheet order={order} />
            </PrintPortal>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
            {children}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-gray-400">{label}</dt>
            <dd className="text-gray-700">{value}</dd>
        </div>
    );
}

function RowKV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between gap-2">
            <span className="text-gray-500">{label}</span>
            <span className={`text-right text-gray-700 ${mono ? "max-w-[150px] truncate font-mono" : ""}`}>
                {value}
            </span>
        </div>
    );
}
