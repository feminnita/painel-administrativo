import { Eye, Package, Percent, RefreshCw } from 'lucide-react';
import { useVisitasAdmin } from '../useVisitasAdmin';

function fmtBRL(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtPct(value: number): string {
    return `${(value * 100).toLocaleString("pt-BR", { maximumSignificantDigits: 1 })}%`;
}

export function VisitasPage() {
    const { rows, loading, load, totalVisits, avgConversion } = useVisitasAdmin();
    const maxVisits = Math.max(...rows.map((r) => r.visits), 1);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Visitas</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Produtos mais visitados na loja (acumulado) e quanto convertem
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
                    { icon: Eye, label: "Visitas totais", value: totalVisits.toLocaleString("pt-BR") },
                    { icon: Package, label: "Produtos com visita", value: String(rows.length) },
                    { icon: Percent, label: "Conversão média", value: fmtPct(avgConversion) },
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

            {/* Ranking */}
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-4 py-3 font-medium">Produto</th>
                            <th className="px-4 py-3 font-medium">Visitas</th>
                            <th className="px-4 py-3 text-center font-medium">Vendidos</th>
                            <th className="px-4 py-3 text-right font-medium">Receita</th>
                            <th className="px-4 py-3 text-center font-medium">Conversão</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const conversion = r.visits > 0 ? r.sold / r.visits : 0;
                            return (
                                <tr key={r.id} className="border-b border-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                {r.image && (
                                                    <img
                                                        src={r.image}
                                                        alt={r.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="max-w-xs truncate font-medium">
                                                    {r.name}
                                                </p>
                                                {!r.active && (
                                                    <span className="text-xs text-gray-400">
                                                        inativo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="w-56 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-[#8C2F39]"
                                                    style={{
                                                        width: `${Math.max((r.visits / maxVisits) * 100, 2)}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="w-12 text-right font-medium">
                                                {r.visits.toLocaleString("pt-BR")}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">{r.sold}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                        R$ {fmtBRL(r.revenue)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${conversion >= 0.05
                                                ? "bg-green-100 text-green-700"
                                                : conversion > 0
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {fmtPct(conversion)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!loading && rows.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-400">
                        Nenhuma visita registrada ainda.
                    </p>
                )}
                {loading && (
                    <p className="py-10 text-center text-sm text-gray-400">
                        Carregando...
                    </p>
                )}
            </div>

            <p className="mt-3 text-xs text-gray-400">
                Visitas são acumuladas desde o cadastro do produto. Conversão = itens
                vendidos (pedidos pagos) ÷ visitas.
            </p>
        </div>
    )
}