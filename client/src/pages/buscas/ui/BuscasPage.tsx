import { RefreshCw, Search, SearchX, Users } from "lucide-react";
import { useBuscasAdmin } from "../useBuscasAdmin";

const PERIODOS = [7, 30, 90];

function quando(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function BuscasPage() {
    const { termos, resumo, loading, load, dias, setDias, percentualPerdido } = useBuscasAdmin();
    const maior = Math.max(...termos.map((t) => t.vezes), 1);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">O que procuram e não acham</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Cada linha é uma cliente que quis comprar e a loja não tinha o que mostrar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border bg-white">
                        {PERIODOS.map((d) => (
                            <button
                                key={d}
                                onClick={() => setDias(d)}
                                className={`px-3 py-2 text-sm ${dias === d
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                {d} dias
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={load}
                        className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                        aria-label="Atualizar"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4 md:max-w-2xl">
                {[
                    { icon: Search, label: "Buscas no período", value: resumo.total.toLocaleString("pt-BR") },
                    { icon: SearchX, label: "Terminaram em nada", value: resumo.sem_resultado.toLocaleString("pt-BR") },
                    {
                        icon: Users,
                        label: "Da procura, perdida",
                        value: `${Math.round(percentualPerdido * 100)}%`,
                    },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                            <Icon size={16} />
                            <span className="text-xs uppercase tracking-wide">{label}</span>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                {loading && !termos.length ? (
                    <p className="p-8 text-center text-sm text-gray-400">Carregando…</p>
                ) : !termos.length ? (
                    // Vazio aqui e AMBIGUO: pode ser que ninguem buscou, ou que
                    // todo mundo achou. O texto tem que dizer qual dos dois.
                    <div className="p-10 text-center">
                        <SearchX className="mx-auto mb-3 text-gray-300" size={32} />
                        <p className="text-gray-600">
                            {resumo.total === 0
                                ? "Ninguém usou a busca da loja neste período."
                                : `As ${resumo.total} buscas do período acharam produto. Nada se perdeu.`}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b text-left text-xs uppercase tracking-wide text-gray-400">
                            <tr>
                                <th className="px-5 py-3 font-medium">Procuraram por</th>
                                <th className="px-5 py-3 text-right font-medium">Buscas</th>
                                <th className="px-5 py-3 text-right font-medium">Pessoas</th>
                                <th className="px-5 py-3 text-right font-medium">Última</th>
                            </tr>
                        </thead>
                        <tbody>
                            {termos.map((t) => (
                                <tr key={t.termo} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-gray-900">{t.termo}</span>
                                        {/* Barra proporcional: o olho acha o que importa sem ler numero. */}
                                        <div className="mt-1 h-1 w-40 overflow-hidden rounded bg-gray-100">
                                            <div
                                                className="h-full rounded bg-[#8C2F39]"
                                                style={{ width: `${(t.vezes / maior) * 100}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums text-gray-900">{t.vezes}</td>
                                    <td className="px-5 py-3 text-right tabular-nums text-gray-500">{t.visitas}</td>
                                    <td className="px-5 py-3 text-right text-gray-400">{quando(t.ultima)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-4 max-w-2xl text-xs text-gray-400">
                Duas leituras para cada termo: ou a peça não existe — e aí é demanda que você
                pode atender — ou existe com outro nome, e aí é o cadastro que precisa do nome
                que a cliente usa. A coluna <strong>Pessoas</strong> separa as duas: dez buscas de
                uma pessoa só é curiosidade; dez pessoas é mercado.
            </p>
        </div>
    );
}
