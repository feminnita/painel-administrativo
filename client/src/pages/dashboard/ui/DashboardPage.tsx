import { Link } from "react-router-dom";
import {
  ArrowRight, BarChart2, CircleDollarSign, RefreshCw,
  ShoppingBag, ShoppingCart, Sun, Ticket,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { useDashboardAdmin } from "../useDashboardAdmin";

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
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

export function DashboardPage() {
  const { admin } = useAuth();
  const {
    report, recentOrders, carts, loading, load, todayRevenue, todayOrders,
  } = useDashboardAdmin();

  const cartsValue = carts.reduce((sum, c) => sum + c.total, 0);
  const maxDay = Math.max(...(report?.byDay.map((d) => d.revenue) ?? [0]), 1);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <Sun size={26} className="text-[#8C2F39]" />
            Bem-Vindo(a) ao Painel Feminnita!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Resumo da loja — últimos 30 dias
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
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: Sun,
            label: "Faturamento hoje",
            value: `R$ ${fmtBRL(todayRevenue)}`,
            sub: `${todayOrders} pedido${todayOrders === 1 ? "" : "s"} hoje`,
          },
          {
            icon: CircleDollarSign,
            label: "Faturamento 30 dias",
            value: `R$ ${fmtBRL(report?.revenue ?? 0)}`,
            sub: null,
          },
          {
            icon: ShoppingCart,
            label: "Pedidos pagos 30 dias",
            value: String(report?.orders ?? 0),
            sub: null,
          },
          {
            icon: Ticket,
            label: "Ticket médio",
            value: `R$ ${fmtBRL(report?.avgTicket ?? 0)}`,
            sub: null,
          },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2 text-gray-400">
              <Icon size={15} />
              <p className="text-xs uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mini gráfico */}

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-gray-700">
              <BarChart2 size={16} /> Faturamento por dia
            </h3>
            <Link
              to="/vendas"
              className="flex items-center gap-1 text-xs font-medium text-[#8C2F39] hover:underline"
            >
              Ver relatório completo <ArrowRight size={12} />
            </Link>
          </div>
          {report && report.byDay.length > 0 ? (
            <div className="flex h-32 items-end gap-[2px]">
              {report.byDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day.slice(8)}/${d.day.slice(5, 7)} — R$ ${fmtBRL(d.revenue)}`}
                  className="flex-1 rounded-t bg-[#8C2F39] transition-opacity hover:opacity-70"
                  style={{
                    height: `${Math.max((d.revenue / maxDay) * 100, 2)}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">
              {loading ? "Carregando..." : "Nenhuma venda nos últimos 30 dias."}
            </p>
          )}
        </div>

        {/* Carrinhos abandonados */}
        <Link
          to="/carrinhos"
          className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-[#8C2F39]/40"
        >
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <ShoppingBag size={15} />
            <p className="text-xs uppercase tracking-wide">
              Carrinhos abandonados
            </p>
          </div>
          <p className="text-3xl font-bold">{carts.length}</p>
          <p className="mt-1 text-sm text-gray-500">
            R$ {fmtBRL(cartsValue)} parados esperando recuperação
          </p>
          <p className="mt-4 flex items-center gap-1 text-xs font-medium text-[#8C2F39] group-hover:underline">
            Recuperar vendas <ArrowRight size={12} />
          </p>
        </Link>
      </div >

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Últimos pedidos */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Últimos pedidos</h3>
            <Link
              to="/pedidos"
              className="flex items-center gap-1 text-xs font-medium text-[#8C2F39] hover:underline"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((o) => {
                const badge =
                  STATUS_BADGES[o.status] ?? STATUS_BADGES.pending;
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {o.orderNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="w-24 text-right text-sm font-bold">
                        R$ {fmtBRL(o.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              {loading ? "Carregando..." : "Nenhum pedido ainda."}
            </p>
          )}
        </div>

        {/* Top produtos */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Mais vendidos</h3>
            <Link
              to="/vendas"
              className="flex items-center gap-1 text-xs font-medium text-[#8C2F39] hover:underline"
            >
              30 dias <ArrowRight size={12} />
            </Link>
          </div>
          {report && report.topProducts.length > 0 ? (
            <div className="space-y-3">
              {report.topProducts.slice(0, 3).map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-[#8C2F39]">
                    {i + 1}º
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.quantity} un · R$ {fmtBRL(p.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              {loading ? "Carregando..." : "Nenhuma venda no período."}
            </p>
          )}
        </div>
      </div>
    </div >
  );
}
