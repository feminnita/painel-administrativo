import {
    MessageCircle, RefreshCw, Search, ShoppingBag, Users, Wallet, X,
} from "lucide-react";
import { useCustomersAdmin } from "../useCustomersAdmin";

function fmtBRL(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR");
}

function whatsappHref(phone: string): string {
    return `https://wa.me/55${phone.replace(/\D/g, "")}`;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
    paid: { label: "Pago", cls: "bg-green-100 text-green-700" },
    processing: { label: "Processando", cls: "bg-blue-100 text-blue-700" },
    shipped: { label: "Enviado", cls: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "Entregue", cls: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-500" },
};

export function CustomersPage() {
    const {
        customers,
        filtered,
        loading,
        search,
        setSearch,
        detail,
        detailLoading,
        openDetail,
        closeDetail,
        load,
    } = useCustomersAdmin();

    const withPurchase = customers.filter((c) => c.paidOrders > 0).length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Cadastradas na loja virtual
                    </p>
                </div>
                <button
                    onClick={load}
                    className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                    aria-label="Atualizar"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-3 gap-4 md:max-w-2xl">
                {[
                    { icon: Users, label: "Clientes", value: String(customers.length) },
                    { icon: ShoppingBag, label: "Com compra", value: String(withPurchase) },
                    { icon: Wallet, label: "Receita total", value: `R$ ${fmtBRL(totalRevenue)}` },
                ].map(({ icon: Icon, label, value }) => (
                    <div
                        key={label}
                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                            <Icon size={15} />
                            <p className="text-xs uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="text-2xl font-bold">{value}</p>
                    </div>
                ))}
            </div>

            {/* Busca */}
            <div className="relative mb-4 max-w-md">
                <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-[#8C2F39] focus:outline-none"
                    placeholder="Buscar por nome, email ou CPF"
                />
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-4 py-3 font-medium">Cliente</th>
                            <th className="px-4 py-3 font-medium">Contato</th>
                            <th className="px-4 py-3 text-center font-medium">Cadastro</th>
                            <th className="px-4 py-3 text-center font-medium">Pedidos pagos</th>
                            <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                            <th className="px-4 py-3 text-center font-medium">Última compra</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((c) => (
                            <tr
                                key={c.id}
                                onClick={() => openDetail(c.id)}
                                className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-red-50/30"
                            >
                                <td className="px-4 py-3">
                                    <p className="font-medium">{c.name}</p>
                                    {c.cpf && (
                                        <p className="text-xs text-gray-400">CPF {c.cpf}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-gray-600">{c.email}</p>
                                    {c.phone && (
                                        <a
                                            href={whatsappHref(c.phone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                                        >
                                            <MessageCircle size={11} /> {c.phone}
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500">
                                    {fmtDate(c.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-center font-medium">
                                    {c.paidOrders}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    R$ {fmtBRL(c.totalSpent)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500">
                                    {fmtDate(c.lastOrderAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filtered.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-400">
                        {search
                            ? "Nenhuma cliente encontrada para essa busca."
                            : "Nenhuma cliente cadastrada ainda."}
                    </p>
                )}
                {loading && (
                    <p className="py-10 text-center text-sm text-gray-400">
                        Carregando...
                    </p>
                )}
            </div>

            {/* ── DRAWER: HISTÓRICO DA CLIENTE ── */}
            {(detail || detailLoading) && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closeDetail}
                    />
                    <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
                        {detailLoading || !detail ? (
                            <p className="py-16 text-center text-sm text-gray-400">
                                Carregando histórico...
                            </p>
                        ) : (
                            <>
                                {/* header */}
                                <div className="flex items-start justify-between border-b px-6 py-4">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800">
                                            {detail.customer.name}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {detail.customer.email}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                            {detail.customer.phone && (
                                                <a
                                                    href={whatsappHref(detail.customer.phone)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-green-600 hover:underline"
                                                >
                                                    <MessageCircle size={11} />
                                                    {detail.customer.phone}
                                                </a>
                                            )}
                                            {detail.customer.cpf && (
                                                <span>CPF {detail.customer.cpf}</span>
                                            )}
                                            {detail.customer.birthDate && (
                                                <span>
                                                    Nasc. {fmtDate(detail.customer.birthDate)}
                                                </span>
                                            )}
                                            <span>
                                                Cliente desde {fmtDate(detail.customer.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeDetail}
                                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* resumo */}
                                <div className="grid grid-cols-3 gap-3 border-b bg-gray-50 px-6 py-3 text-center">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            Pedidos
                                        </p>
                                        <p className="font-bold">{detail.orders.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            Pagos
                                        </p>
                                        <p className="font-bold">
                                            {
                                                detail.orders.filter(
                                                    (o) =>
                                                        o.paymentStatus === "paid" &&
                                                        o.status !== "cancelled",
                                                ).length
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                            Total pago
                                        </p>
                                        <p className="font-bold text-[#8C2F39]">
                                            R${" "}
                                            {fmtBRL(
                                                detail.orders
                                                    .filter(
                                                        (o) =>
                                                            o.paymentStatus === "paid" &&
                                                            o.status !== "cancelled",
                                                    )
                                                    .reduce((sum, o) => sum + o.total, 0),
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* histórico de pedidos */}
                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {detail.orders.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-gray-400">
                                            Nenhum pedido ainda.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {detail.orders.map((o) => {
                                                const badge =
                                                    STATUS_BADGES[o.status] ??
                                                    STATUS_BADGES.pending;
                                                return (
                                                    <div
                                                        key={o.id}
                                                        className="rounded-lg border border-gray-100 p-3"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-semibold">
                                                                    {o.orderNumber}
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    {fmtDate(o.createdAt)} · {o.items}{" "}
                                                                    item{o.items === 1 ? "" : "s"}
                                                                    {o.paymentMethod
                                                                        ? ` · ${o.paymentMethod}`
                                                                        : ""}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span
                                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                                                                >
                                                                    {badge.label}
                                                                </span>
                                                                <span className="text-sm font-bold">
                                                                    R$ {fmtBRL(o.total)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}
