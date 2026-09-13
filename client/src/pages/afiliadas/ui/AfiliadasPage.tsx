import { useState } from "react";
import { Ban, Check, Clock, Copy, HandCoins, Pause, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { useAfiliadasAdmin } from "../useAfiliadasAdmin";
import type { Afiliada, StatusAfiliada } from "../type";

const SITE = "https://feminnita.com.br";

function brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CORES: Record<StatusAfiliada, string> = {
    pendente: "bg-amber-50 text-amber-700 border-amber-200",
    aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pausada: "bg-gray-50 text-gray-600 border-gray-200",
    bloqueada: "bg-red-50 text-red-700 border-red-200",
};

export function AfiliadasPage() {
    const {
        linhas, loading, load,
        mudarStatus, mudarPercentual, registrarPagamento,
        pendentes, totalAPagar, totalVendido,
    } = useAfiliadasAdmin();

    const [pagando, setPagando] = useState<string | null>(null);
    const [valorPag, setValorPag] = useState("");

    function copiarLink(a: Afiliada) {
        const link = `${SITE}/?ref=${a.codigo}`;
        navigator.clipboard?.writeText(link).then(
            () => toast.success("Link copiado. É esse que ela divulga."),
            () => toast.error("Não consegui copiar. O link é: " + link),
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Afiliadas</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Quem divulga, quanto trouxe e quanto você deve
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

            <div className="mb-6 grid grid-cols-3 gap-4 md:max-w-2xl">
                {[
                    { icon: Clock, label: "Esperando você aprovar", value: String(pendentes) },
                    { icon: HandCoins, label: "Você deve", value: brl(totalAPagar) },
                    { icon: Users, label: "Elas venderam", value: brl(totalVendido) },
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

            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {loading && !linhas.length ? (
                    <p className="p-8 text-center text-sm text-gray-400">Carregando…</p>
                ) : !linhas.length ? (
                    <div className="p-10 text-center">
                        <Users className="mx-auto mb-3 text-gray-300" size={32} />
                        <p className="text-gray-600">Nenhuma afiliada ainda.</p>
                        <p className="mt-1 text-sm text-gray-400">
                            Quem se inscrever na loja aparece aqui como pendente, esperando sua aprovação.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b text-left text-xs uppercase tracking-wide text-gray-400">
                            <tr>
                                <th className="px-5 py-3 font-medium">Afiliada</th>
                                <th className="px-5 py-3 font-medium">Link</th>
                                <th className="px-5 py-3 text-right font-medium">Comissão</th>
                                <th className="px-5 py-3 text-right font-medium">Vendeu</th>
                                <th className="px-5 py-3 text-right font-medium">Você deve</th>
                                <th className="px-5 py-3 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas.map((a) => (
                                <tr key={a.id} className="border-b align-top last:border-0 hover:bg-gray-50">
                                    <td className="px-5 py-3">
                                        <div className="font-medium text-gray-900">{a.nome}</div>
                                        <div className="text-xs text-gray-400">{a.email}</div>
                                        {a.instagram && (
                                            <div className="text-xs text-gray-400">{a.instagram}</div>
                                        )}
                                        <span
                                            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${CORES[a.status]}`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>

                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => copiarLink(a)}
                                            className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#8C2F39]"
                                            title="Copiar o link dela"
                                        >
                                            <Copy size={12} />
                                            /?ref={a.codigo}
                                        </button>
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        <input
                                            type="number"
                                            defaultValue={a.percentual}
                                            min={0}
                                            max={100}
                                            step="0.5"
                                            onBlur={(e) => {
                                                const v = Number(e.target.value);
                                                if (v !== a.percentual) mudarPercentual(a.id, v);
                                            }}
                                            className="w-16 rounded border px-2 py-1 text-right tabular-nums"
                                        />
                                        <span className="ml-1 text-gray-400">%</span>
                                    </td>

                                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                                        {brl(a.vendido)}
                                        <div className="text-xs text-gray-400">
                                            {a.pedidos} {a.pedidos === 1 ? "pedido" : "pedidos"}
                                        </div>
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        <div
                                            className={`font-semibold tabular-nums ${a.a_pagar > 0 ? "text-gray-900" : "text-gray-300"}`}
                                        >
                                            {brl(a.a_pagar)}
                                        </div>
                                        {a.pago > 0 && (
                                            <div className="text-xs text-gray-400">
                                                já pago {brl(a.pago)}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap items-center gap-1">
                                            {a.status !== "aprovada" && (
                                                <button
                                                    onClick={() => mudarStatus(a.id, "aprovada")}
                                                    className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <Check size={12} /> Aprovar
                                                </button>
                                            )}
                                            {a.status === "aprovada" && (
                                                <button
                                                    onClick={() => mudarStatus(a.id, "pausada")}
                                                    className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                                >
                                                    <Pause size={12} /> Pausar
                                                </button>
                                            )}
                                            {a.status !== "bloqueada" && (
                                                <button
                                                    onClick={() => mudarStatus(a.id, "bloqueada")}
                                                    className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                >
                                                    <Ban size={12} /> Bloquear
                                                </button>
                                            )}

                                            {a.a_pagar > 0 && (
                                                pagando === a.id ? (
                                                    <span className="flex items-center gap-1">
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={valorPag}
                                                            onChange={(e) => setValorPag(e.target.value)}
                                                            placeholder={a.a_pagar.toFixed(2)}
                                                            className="w-20 rounded border px-2 py-1 text-xs"
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                const v = Number(valorPag || a.a_pagar);
                                                                await registrarPagamento(a.id, v, "pix");
                                                                setPagando(null);
                                                                setValorPag("");
                                                            }}
                                                            className="rounded bg-gray-900 px-2 py-1 text-xs text-white"
                                                        >
                                                            confirmar
                                                        </button>
                                                        <button
                                                            onClick={() => { setPagando(null); setValorPag(""); }}
                                                            className="px-1 text-xs text-gray-400"
                                                        >
                                                            cancelar
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => { setPagando(a.id); setValorPag(""); }}
                                                        className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <HandCoins size={12} /> Paguei
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        {a.chave_pix && (
                                            <div className="mt-1 text-[11px] text-gray-400">
                                                PIX: {a.chave_pix}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-4 max-w-3xl text-xs text-gray-400">
                <strong>Você deve</strong> é a comissão dos pedidos <strong>pagos e não cancelados</strong>,
                menos o que você já marcou como pago. Pedido pendente não entra — comissão é sobre venda
                que aconteceu. Mudar a porcentagem vale só para as <strong>próximas</strong> vendas: cada
                pedido guarda o percentual que valia no dia, senão o que você já deve mudaria sozinho.
            </p>
        </div>
    );
}
