import { useState } from "react";
import { BarChart2, CircleDollarSign, Eye, EyeOff, Package, RefreshCw, ShoppingCart, Ticket, } from "lucide-react";
import { alternarValoresOcultos, fmtValor, useValoresOcultos } from "@/lib/valoresOcultos";
import { useVendasAdmin } from "../useVendasAdmin";
import type { SalesDay, SalesReport } from "../type";

const PERIODOS = [7, 30, 90] as const;

const METHOD_LABELS: Record<string, string> = {
    PIX: "PIX",
    pix: "PIX",
    CREDIT_CARD: "Cartão de crédito",
    credit_card: "Cartão de crédito",
    BOLETO: "Boleto",
    boleto: "Boleto",
    desconhecido: "Não Informado",
};

function fmtDay(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
}

function isoDate(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

// Primeiro e último dia do mês "YYYY-MM"; no mês corrente, para em hoje.
function monthRange(month: string): { from: string; to: string } {
    const [y, m] = month.split("-").map(Number);
    const last = isoDate(new Date(y, m, 0));
    const today = isoDate(new Date());
    return { from: `${month}-01`, to: last < today ? last : today };
}

function fillDays(report: SalesReport): SalesDay[] {
    const byKey = new Map(report.byDay.map((d) => [d.day, d]));
    const result: SalesDay[] = [];

    const start = report.from
        ? new Date(`${report.from}T12:00:00`)
        : new Date(Date.now() - (report.days - 1) * 86_400_000);
    const end = report.from ? new Date(`${report.to}T12:00:00`) : new Date();

    for (const date = start; isoDate(date) <= isoDate(end); date.setDate(date.getDate() + 1)) {
        const key = isoDate(date);
        result.push(byKey.get(key) ?? { day: key, revenue: 0, orders: 0 });
    }
    return result;
}

function RevenueChart({ report }: { report: SalesReport }) {
    const [hover, setHover] = useState<number | null>(null);
    const oculto = useValoresOcultos();
    const fmtBRL = (value: number) => fmtValor(value, oculto);
    const data = fillDays(report);
    const max = Math.max(...data.map((d) => d.revenue), 1);

    const gridLines = [1, 0.5];
    const labelEvery = Math.ceil(data.length / 6);

    return (
        <div>
            <div className="relative h-52">
                {/* linhas de grade recessivas + valores de referência */}
                {gridLines.map((frac) => (
                    <div
                        key={frac}
                        className="absolute inset-x-0 border-t border-gray-100"
                        style={{ bottom: `${frac * 100}%` }}
                    >
                        <span className="absolute -top-2 right-0 text-[10px] text-gray-400">
                            R$ {fmtBRL(max * frac)}
                        </span>
                    </div>
                ))}
                <div className="absolute inset-x-0 bottom-0 border-t border-gray-200" />

                {/* tooltip */}
                {hover !== null && (
                    <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg"
                        style={{
                            left: `${((hover + 0.5) / data.length) * 100}%`,
                            bottom: `${(data[hover].revenue / max) * 100}%`,
                            marginBottom: 8,
                        }}
                    >
                        <p className="font-semibold">{fmtDay(data[hover].day)}</p>
                        <p>R$ {fmtBRL(data[hover].revenue)}</p>
                        <p className="text-gray-300">
                            {data[hover].orders} pedido{data[hover].orders === 1 ? "" : "s"}
                        </p>
                    </div>
                )}

                {/* barras */}
                <div className="absolute inset-0 flex items-end gap-[2px]">
                    {data.map((d, i) => (
                        <div
                            key={d.day}
                            className="flex h-full flex-1 cursor-pointer items-end"
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                        >
                            <div
                                className={`w-full rounded-t transition-colors ${hover === i ? "bg-[#7a2832]" : "bg-[#8C2F39]"
                                    }`}
                                style={{
                                    height:
                                        d.revenue > 0
                                            ? `${Math.max((d.revenue / max) * 100, 1.5)}%`
                                            : "2px",
                                    opacity: d.revenue > 0 ? 1 : 0.15,
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* eixo x: rótulos esparsos pra não colidir */}
            <div className="mt-1 flex gap-[2px]">
                {data.map((d, i) => (
                    <div key={d.day} className="flex-1 text-center">
                        {(i % labelEvery === 0 || i === data.length - 1) && (
                            <span className="text-[10px] text-gray-400">
                                {fmtDay(d.day)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

}

export function VendasPage() {
    const { report, loading, period, setPeriod, load } = useVendasAdmin();
    const oculto = useValoresOcultos();
    const fmtBRL = (value: number) => fmtValor(value, oculto);
    const month = "from" in period && period.from.endsWith("-01") &&
        monthRange(period.from.slice(0, 7)).to === period.to
        ? period.from.slice(0, 7)
        : "";

    const subtitle = "from" in period
        ? `Pedidos pagos de ${fmtDay(period.from)}/${period.from.slice(0, 4)} a ${fmtDay(period.to)}/${period.to.slice(0, 4)}`
        : `Pedidos pagos nos últimos ${period.days} dias`;

    const kpis = report
        ? [
            {
                icon: CircleDollarSign,
                label: "Faturamento",
                value: `R$ ${fmtBRL(report.revenue)}`,
            },
            {
                icon: ShoppingCart,
                label: "Pedidos pagos",
                value: String(report.orders),
            },
            {
                icon: Ticket,
                label: "Ticket médio",
                value: `R$ ${fmtBRL(report.avgTicket)}`,
            },
            {
                icon: Package,
                label: "Itens vendidos",
                value: String(report.itemsSold),
            },
        ]
        : [];

    return (
        <div className="p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
                    <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-500">
                        Mês
                        <input
                            type="month"
                            value={month}
                            max={isoDate(new Date()).slice(0, 7)}
                            onChange={(e) => e.target.value && setPeriod(monthRange(e.target.value))}
                            className={`rounded-md px-1 text-sm ${month ? "font-medium text-[#8C2F39]" : "text-gray-700"}`}
                        />
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-500">
                        De
                        <input
                            type="date"
                            value={"from" in period ? period.from : ""}
                            max={isoDate(new Date())}
                            onChange={(e) => {
                                const from = e.target.value;
                                if (!from) return;
                                const to = "from" in period && period.to >= from ? period.to : isoDate(new Date());
                                setPeriod({ from, to });
                            }}
                            className="text-sm text-gray-700"
                        />
                        até
                        <input
                            type="date"
                            value={"from" in period ? period.to : ""}
                            max={isoDate(new Date())}
                            onChange={(e) => {
                                const to = e.target.value;
                                if (!to) return;
                                const from = "from" in period && period.from <= to ? period.from : `${to.slice(0, 7)}-01`;
                                setPeriod({ from, to });
                            }}
                            className="text-sm text-gray-700"
                        />
                    </label>
                    <div className="flex rounded-lg border bg-white p-1">
                        {PERIODOS.map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod({ days: p })}
                                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${"days" in period && period.days === p
                                    ? "bg-[#8C2F39] text-white"
                                    : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                {p} dias
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={alternarValoresOcultos}
                        className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                        aria-label={oculto ? "Mostrar valores" : "Esconder valores"}
                        title={oculto ? "Mostrar valores" : "Esconder valores"}
                    >
                        {oculto ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                        onClick={load}
                        className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                        aria-label="Atualizar"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {kpis.map(({ icon: Icon, label, value }) => (
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
                {loading &&
                    !report &&
                    Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl border border-gray-100 bg-white"
                        />
                    ))}
            </div>

            {/* Gráfico */}
            <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 flex items-center gap-2 font-semibold text-gray-700">
                    <BarChart2 size={16} /> Faturamento por dia
                </h3>
                {report && report.byDay.length > 0 ? (
                    <RevenueChart report={report} />
                ) : (
                    <p className="py-10 text-center text-sm text-gray-400">
                        {loading ? "Carregando..." : "Nenhuma venda no período."}
                    </p>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top produtos */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-1 font-semibold text-gray-700">
                        Ranking dos mais vendidos
                    </h3>
                    <p className="mb-4 text-xs text-gray-400">
                        Peças vendidas no período, pedidos pagos.
                    </p>
                    {report && report.topProducts.length > 0 ? (
                        <div className="max-h-[520px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-400">
                                    <th className="w-8 pb-2 font-medium">#</th>
                                    <th className="pb-2 font-medium">Produto</th>
                                    <th className="pb-2 text-center font-medium">Peças</th>
                                    <th className="pb-2 text-center font-medium">Pedidos</th>
                                    <th className="pb-2 text-right font-medium">Receita</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.topProducts.map((p, i) => (
                                    <tr key={p.code || p.name} className="border-b border-gray-50">
                                        <td className="py-2.5 font-semibold text-gray-400">
                                            {i + 1}º
                                        </td>
                                        <td className="max-w-0 truncate py-2.5 pr-3 font-medium" title={p.name}>
                                            {p.code && (
                                                <span className="mr-2 font-mono text-xs text-gray-500">
                                                    {p.code}
                                                </span>
                                            )}
                                            {p.name}
                                        </td>
                                        <td className="py-2.5 text-center font-semibold">
                                            {p.quantity}
                                        </td>
                                        <td className="py-2.5 text-center text-gray-500">
                                            {p.orders}
                                        </td>
                                        <td className="whitespace-nowrap py-2.5 text-right font-semibold">
                                            R$ {fmtBRL(p.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-gray-400">
                            {loading ? "Carregando..." : "Nenhuma venda no período."}
                        </p>
                    )}
                </div>

                {/* Formas de pagamento */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-gray-700">
                        Formas de pagamento
                    </h3>
                    {report && report.byPaymentMethod.length > 0 ? (
                        <div className="space-y-4">
                            {report.byPaymentMethod.map((m) => {
                                const share =
                                    report.revenue > 0 ? m.revenue / report.revenue : 0;
                                return (
                                    <div key={m.method}>
                                        <div className="mb-1 flex items-baseline justify-between text-sm">
                                            <span className="font-medium">
                                                {METHOD_LABELS[m.method] ?? m.method}
                                            </span>
                                            <span className="text-gray-500">
                                                {m.orders} pedido{m.orders === 1 ? "" : "s"} · R${" "}
                                                {fmtBRL(m.revenue)}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-[#8C2F39]"
                                                style={{ width: `${Math.max(share * 100, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-gray-400">
                            {loading ? "Carregando..." : "Nenhuma venda no período."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}