import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, PackageX, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api/client";

/**
 * Postagens: todo pedido pago que ainda não chegou na cliente, e se o pacote
 * já foi bipado. Prazo para bipar: 1 dia útil, no máximo 2 (sábado e domingo
 * não contam — compra de sexta vence na terça).
 *
 * Criada em 15/10/2026: a Claramel segurava pacotes sem bipar e a loja só
 * descobria quando a cliente reclamava.
 */

type Linha = {
    orderId: string;
    orderNumber: string;
    cliente: string;
    telefone: string | null;
    compra: string;
    total: number;
    transportadora: string | null;
    ponto: string | null;
    rastreio: string | null;
    etapa: "sem_etiqueta" | "etiqueta_paga" | "recebido_no_ponto" | "postado" | "etiqueta_cancelada" | "erro_consulta";
    bipadoEm: string | null;
    limite: string;
    situacao: "no_prazo" | "vence_hoje" | "atrasado" | "bipado" | "bipado_com_atraso";
    diasDeAtraso: number;
    entregaAtrasada: boolean;
    paradoNoPonto: boolean;
};

const ETAPA: Record<Linha["etapa"], string> = {
    sem_etiqueta: "Sem etiqueta",
    etiqueta_paga: "Etiqueta paga — não bipado",
    recebido_no_ponto: "Bipado no ponto",
    postado: "Com a transportadora",
    etiqueta_cancelada: "Etiqueta cancelada",
    erro_consulta: "Melhor Envio não respondeu",
};

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function dia(iso: string): string {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
    return `${SEMANA[d.getDay()]} ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
}

function alerta(l: Linha): { texto: string; cor: string } | null {
    if (l.etapa === "etiqueta_cancelada" || l.etapa === "erro_consulta")
        return { texto: "Conferir", cor: "bg-gray-200 text-gray-800" };
    if (l.situacao === "atrasado")
        return { texto: `Atrasado ${l.diasDeAtraso} dia${l.diasDeAtraso > 1 ? "s" : ""} útil${l.diasDeAtraso > 1 ? "eis" : ""}`, cor: "bg-red-100 text-red-800" };
    if (l.situacao === "vence_hoje") return { texto: "Bipar hoje", cor: "bg-amber-100 text-amber-800" };
    if (l.paradoNoPonto) return { texto: "Parado no ponto", cor: "bg-red-100 text-red-800" };
    if (l.entregaAtrasada) return { texto: "Entrega atrasada", cor: "bg-orange-100 text-orange-800" };
    return null;
}

function Tabela({ linhas }: { linhas: Linha[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-4 py-3">Pedido</th>
                        <th className="px-4 py-3">Compra</th>
                        <th className="px-4 py-3">Bipar até</th>
                        <th className="px-4 py-3">Transportadora · ponto</th>
                        <th className="px-4 py-3">Etapa</th>
                        <th className="px-4 py-3">Situação</th>
                        <th className="px-4 py-3">Rastreio</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {linhas.map((l) => {
                        const a = alerta(l);
                        return (
                            <tr key={l.orderId} className={a?.cor.startsWith("bg-red") ? "bg-red-50/40" : ""}>
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900">{l.orderNumber}</div>
                                    <div className="text-xs text-gray-500">{l.cliente}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{dia(l.compra)}</td>
                                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{dia(l.limite)}</td>
                                <td className="px-4 py-3">
                                    <div>{l.transportadora ?? "—"}</div>
                                    <div className="text-xs text-gray-500">{l.ponto ?? ""}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div>{ETAPA[l.etapa]}</div>
                                    {l.bipadoEm && <div className="text-xs text-gray-500">bipado {dia(l.bipadoEm)}</div>}
                                </td>
                                <td className="px-4 py-3">
                                    {a ? (
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${a.cor}`}>{a.texto}</span>
                                    ) : l.situacao === "bipado_com_atraso" ? (
                                        <span className="text-xs text-gray-500">bipado com {l.diasDeAtraso}d de atraso</span>
                                    ) : (
                                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Em dia</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{l.rastreio ?? "—"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function PostagensPage() {
    const [linhas, setLinhas] = useState<Linha[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (forcar = false) => {
        setLoading(true);
        try {
            setLinhas(await api.get<Linha[]>(`/api/admin/postagens${forcar ? "?atualizar=1" : ""}`));
        } catch (error) {
            console.error("Erro ao carregar postagens:", error);
            toast.error("Não consegui consultar as postagens no Melhor Envio");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const acao = linhas.filter((l) => alerta(l)).sort((x, y) => y.diasDeAtraso - x.diasDeAtraso);
    const aguardando = linhas.filter((l) => !alerta(l) && !l.bipadoEm);
    const transito = linhas.filter((l) => !alerta(l) && l.bipadoEm);

    const conta = (f: (l: Linha) => boolean) => linhas.filter(f).length;
    const cartoes = [
        { rotulo: "Atrasados sem bipar", valor: conta((l) => l.situacao === "atrasado" && !["etiqueta_cancelada", "erro_consulta"].includes(l.etapa)), icone: AlertTriangle, cor: "text-red-700" },
        { rotulo: "Bipar hoje", valor: conta((l) => l.situacao === "vence_hoje"), icone: Clock, cor: "text-amber-700" },
        { rotulo: "Parados no ponto", valor: conta((l) => l.paradoNoPonto), icone: PackageX, cor: "text-red-700" },
        { rotulo: "Entrega atrasada", valor: conta((l) => l.entregaAtrasada), icone: Truck, cor: "text-orange-700" },
    ];

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Postagens</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Prazo para bipar: 1 dia útil, no máximo 2. Sábado e domingo não contam — compra de sexta vence na terça.
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                    aria-label="Atualizar"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {cartoes.map((c) => (
                    <div key={c.rotulo} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400">
                            <c.icone size={14} /> {c.rotulo}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${c.valor ? c.cor : "text-gray-300"}`}>{c.valor}</p>
                    </div>
                ))}
            </div>

            {loading && linhas.length === 0 && <p className="text-sm text-gray-500">Consultando o Melhor Envio…</p>}

            {!loading && acao.length === 0 && linhas.length > 0 && (
                <div className="mb-8 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                    <CheckCircle2 size={18} /> Nenhum pacote atrasado ou parado.
                </div>
            )}

            {acao.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 text-lg font-semibold text-red-800">Precisa de ação ({acao.length})</h2>
                    <Tabela linhas={acao} />
                </section>
            )}
            {aguardando.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Aguardando bipar, no prazo ({aguardando.length})</h2>
                    <Tabela linhas={aguardando} />
                </section>
            )}
            {transito.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Bipados, a caminho da cliente ({transito.length})</h2>
                    <Tabela linhas={transito} />
                </section>
            )}
        </div>
    );
}
