import { useEffect, useState } from "react";
import {
    Check,
    ChevronDown,
    Eye,
    Filter,
    Loader2,
    MessageCircle,
    Package,
    Printer,
    RefreshCw,
    Search,
    Send,
    Truck,
} from "lucide-react";
import { useOrdersAdmin } from "../useOrdersAdmin";
import {
    derivePaymentStatus,
    deriveFulfillmentStatus,
    displayStatus,
    fmtBRL,
    FULFILLMENT_STATUS_META,
    isSandboxLabel,
    orderPieceCount,
    orderThumbnails,
    OVERRIDE_OPTIONS,
    PAYMENT_LABELS,
    PAYMENT_STATUS_META,
    STATUS_OPTIONS,
} from "../domain";
import type { Order, OverrideValue } from "../types";
import { PrintPortal, RomaneioSheet } from "./PrintSheets";

export function OrdersPage() {
    const {
        filtered,
        totalRevenue,
        orders,
        loading,
        lastUpdated,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        setStatusOverride,
        pushingBlingId,
        pushToBling,
        selectedIds,
        selectedOrders,
        toggleSelect,
        toggleSelectAll,
        allFilteredSelected,
        clearSelection,
        reload,
    } = useOrdersAdmin();

    // Impressao (romaneio) em lote ou de um pedido: renderiza o portal e chama print().
    const [printOrders, setPrintOrders] = useState<Order[] | null>(null);
    useEffect(() => {
        if (printOrders && printOrders.length) {
            const t = window.setTimeout(() => {
                window.print();
                setPrintOrders(null);
            }, 60);
            return () => window.clearTimeout(t);
        }
    }, [printOrders]);

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
                    <p className="mt-1 text-gray-500">{orders.length} pedidos no total</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <button
                        onClick={reload}
                        title="Atualizar agora"
                        className="rounded-lg border p-1.5 text-gray-500 hover:bg-gray-50"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {lastUpdated && (
                        <span>
                            atualizado às{" "}
                            {lastUpdated.toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-sm text-gray-500">Total de pedidos</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-5">
                    <p className="mb-1 text-sm text-yellow-700">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-700">
                        {orders.filter((o) => derivePaymentStatus(o) === "pending").length}
                    </p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                    <p className="mb-1 text-sm text-green-700">Pagos</p>
                    <p className="text-2xl font-bold text-green-700">
                        {orders.filter((o) => derivePaymentStatus(o) === "paid").length}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-sm text-gray-500">Receita total</p>
                    <p className="text-xl font-bold text-[#8C2F39]">R$ {fmtBRL(totalRevenue)}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={17}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar pedido, cliente, rastreio..."
                        className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                    />
                </div>
                <div className="relative">
                    <Filter
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={15}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none rounded-lg border bg-white py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                    >
                        <option value="all">Ativos (fila)</option>
                        {Object.entries(STATUS_OPTIONS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                        size={14}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="Data inicial"
                        className="rounded-lg border py-2 px-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                    />
                    <span className="text-xs text-gray-400">até</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="Data final"
                        className="rounded-lg border py-2 px-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                    />
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => {
                                setDateFrom("");
                                setDateTo("");
                            }}
                            className="text-xs text-gray-400 hover:text-[#8C2F39]"
                        >
                            limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de selecao em lote */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-[#8C2F39] focus:ring-[#8C2F39]"
                    />
                    Selecionar todos
                </label>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                        </span>
                        <button
                            onClick={() => setPrintOrders(selectedOrders)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C2F39] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a2832]"
                        >
                            <Printer size={14} /> Imprimir romaneios ({selectedIds.size})
                        </button>
                        <button
                            onClick={clearSelection}
                            className="text-sm text-gray-400 hover:text-[#8C2F39]"
                        >
                            limpar
                        </button>
                    </div>
                )}
            </div>

            {/* Lista */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <Package size={48} className="mx-auto mb-3" />
                        <p>Nenhum pedido encontrado</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((order) => {
                            const pay = derivePaymentStatus(order);
                            const ful = deriveFulfillmentStatus(order);
                            const disp = displayStatus(order);
                            const thumbs = orderThumbnails(order);
                            const pieces = orderPieceCount(order);
                            const phone = (order.customer_phone || "").replace(/\D/g, "");
                            const payLabel =
                                PAYMENT_LABELS[order.payment_method || ""] ||
                                order.payment_method ||
                                "—";
                            const labelHref =
                                order.label_url && !isSandboxLabel(order.label_url)
                                    ? order.label_url
                                    : null;
                            return (
                                <div
                                    key={order.id}
                                    className="flex items-start gap-3 p-4 transition-colors hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(order.id)}
                                        onChange={() => toggleSelect(order.id)}
                                        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#8C2F39] focus:ring-[#8C2F39]"
                                    />

                                    {/* Miniaturas */}
                                    <div className="flex shrink-0 -space-x-2">
                                        {thumbs.slice(0, 3).map((src, i) => (
                                            <div
                                                key={i}
                                                className="h-11 w-9 overflow-hidden rounded-md border-2 border-white bg-gray-100 shadow-sm"
                                            >
                                                <img src={src} alt="" className="h-full w-full object-cover" />
                                            </div>
                                        ))}
                                        {thumbs.length === 0 && (
                                            <div className="flex h-11 w-9 items-center justify-center rounded-md border-2 border-white bg-gray-100 shadow-sm">
                                                <Package size={16} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info principal */}
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-gray-900">
                                                {order.order_number}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${disp.color}`}
                                            >
                                                {disp.label}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_META[pay].color}`}
                                            >
                                                {PAYMENT_STATUS_META[pay].label}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${FULFILLMENT_STATUS_META[ful].color}`}
                                            >
                                                {FULFILLMENT_STATUS_META[ful].label}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-gray-700">{order.customer_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(order.created_at).toLocaleString("pt-BR")}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Truck size={12} className="text-gray-400" />
                                                {order.shipping_method || "—"}
                                            </span>
                                            <span className="inline-flex items-center gap-1">💳 {payLabel}</span>
                                            <span>
                                                {pieces} {pieces === 1 ? "peça" : "peças"}
                                            </span>
                                        </div>
                                        {order.tracking_code && (
                                            <p className="mt-0.5 font-mono text-xs text-indigo-500">
                                                {order.tracking_code}
                                            </p>
                                        )}
                                    </div>

                                    {/* Total + acoes */}
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <p className="font-bold text-gray-900">R$ {fmtBRL(order.total)}</p>

                                        {/* Sobrescrita (override) manual - excecao apenas */}
                                        <select
                                            value={order.status_override ?? ""}
                                            onChange={(e) =>
                                                setStatusOverride(
                                                    order.id,
                                                    (e.target.value || null) as OverrideValue | null,
                                                )
                                            }
                                            title="Sobrescrever status (exceção). Vazio = automático (derivado)."
                                            className="max-w-[150px] rounded-lg border bg-white px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-[#8C2F39]"
                                        >
                                            <option value="">Automático (derivado)</option>
                                            {OVERRIDE_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="flex items-center gap-1">
                                            {/* WhatsApp */}
                                            {phone ? (
                                                <a
                                                    href={`https://wa.me/55${phone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Abrir WhatsApp do cliente"
                                                    className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600"
                                                >
                                                    <MessageCircle size={13} />
                                                </a>
                                            ) : (
                                                <button
                                                    disabled
                                                    title="Cliente sem telefone cadastrado"
                                                    className="cursor-not-allowed rounded-lg border p-1.5 text-gray-300"
                                                >
                                                    <MessageCircle size={13} />
                                                </button>
                                            )}

                                            {/* Impressora - romaneio deste pedido */}
                                            <button
                                                onClick={() => setPrintOrders([order])}
                                                title="Imprimir romaneio"
                                                className="rounded-lg border p-1.5 text-gray-600 hover:bg-gray-50"
                                            >
                                                <Printer size={13} />
                                            </button>

                                            {/* Caminhao - envio (etiqueta ou pagina do pedido) */}
                                            <a
                                                href={labelHref ?? `/pedidos/${order.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={labelHref ? "Ver etiqueta" : "Envio / etiqueta"}
                                                className="rounded-lg border p-1.5 text-indigo-600 hover:bg-indigo-50"
                                            >
                                                <Truck size={13} />
                                            </a>

                                            {/* Bling */}
                                            {order.bling_order_id ? (
                                                <span
                                                    title={`Pedido no Bling (#${order.bling_order_id})`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                                                >
                                                    <Check size={12} /> no Bling #{order.bling_order_id}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => pushToBling(order.id)}
                                                    disabled={pushingBlingId === order.id}
                                                    title="Enviar pedido ao Bling"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[#8C2F39] px-2 py-1 text-xs font-medium text-[#8C2F39] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {pushingBlingId === order.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Send size={12} />
                                                    )}
                                                    Enviar ao Bling
                                                </button>
                                            )}

                                            {/* Olho - abre a pagina do pedido em NOVA ABA */}
                                            <a
                                                href={`/pedidos/${order.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Abrir pedido (nova aba)"
                                                className="rounded-lg border p-1.5 text-gray-500 hover:bg-gray-50"
                                            >
                                                <Eye size={13} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {printOrders && (
                <PrintPortal>
                    {printOrders.map((o) => (
                        <RomaneioSheet key={o.id} order={o} />
                    ))}
                </PrintPortal>
            )}
        </div>
    );
}
