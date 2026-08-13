import {
    ChevronDown,
    Eye,
    Filter,
    Package,
    Search,
} from "lucide-react";
import { useOrdersAdmin } from "../useOrdersAdmin";
import {
    derivePaymentStatus,
    deriveFulfillmentStatus,
    fmtBRL,
    FULFILLMENT_STATUS_META,
    PAYMENT_STATUS_META,
    STATUS_OPTIONS,
} from "../domain";
import { OrderDetail } from "./OrderDetail";

export function OrdersPage() {
    const vm = useOrdersAdmin();
    const {
        filtered,
        totalRevenue,
        orders,
        loading,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        selected,
        select,
    } = vm;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
                <p className="mt-1 text-gray-500">{orders.length} pedidos no total</p>
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
                    <p className="text-xl font-bold text-[#8C2F39]">
                        R$ {fmtBRL(totalRevenue)}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* List */}
                <div className="min-w-0 flex-1">
                    <div className="mb-4 flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="relative flex-1">
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
                                <option value="all">Todos os status</option>
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
                    </div>

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
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => select(order)}
                                            className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${selected?.id === order.id
                                                ? "border-l-4 border-[#8C2F39] bg-rose-50"
                                                : ""
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-gray-900">
                                                            {order.order_number}
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
                                                    <p className="truncate text-sm text-gray-700">
                                                        {order.customer_name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(order.created_at).toLocaleString("pt-BR")}
                                                    </p>
                                                    {order.tracking_code && (
                                                        <p className="mt-0.5 text-xs text-indigo-500">
                                                            {order.tracking_code}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="font-bold text-gray-900">
                                                        R$ {fmtBRL(order.total)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {order.items?.length || 0} item(s)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail panel */}
                <div className="w-full shrink-0 lg:w-96">
                    {selected ? (
                        <OrderDetail vm={vm} />
                    ) : (
                        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-400 shadow-sm">
                            <Eye size={40} className="mx-auto mb-3" />
                            <p className="text-sm">
                                Clique em um pedido para ver os detalhes
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
