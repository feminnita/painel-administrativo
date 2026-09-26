import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AlertTriangle, BadgeDollarSign } from "lucide-react";

// Gasto da Meta ao lado da venda que aconteceu de verdade, por arte.
//
// A receita NAO vem da Meta: vem do pedido no banco. A Meta infla atribuicao —
// conta como venda dela quem ja ia comprar. O que ela tem de unico e o custo.
//
// A tabela e uma so, com etiqueta na linha, em vez de cinco blocos separados.
// Separado em blocos esconde a comparacao, que e justamente o que interessa:
// ver lado a lado quem gasta igual e vende diferente.

type Arte = {
    arte: string;
    gasto7: number;
    gasto30: number;
    cliques30: number;
    pedidos30: number;
    pedidos7: number;
    receita30: number;
    custoPorCompra: number | null;
    retorno: number | null;
    anuncios: string[];
    classe: "vencedor" | "promissor" | "cansado" | "morto" | "abaixo da meta";
    porque: string;
};

type Resposta = {
    conectada: boolean;
    aviso?: string;
    erroDaMeta?: string | null;
    regra?: { retornoAlvo: number; gastoMinimo: number; ticketMedio: number; explicacao: string };
    resumo?: { gasto30: number; receitaAtribuida: number; retornoGeral: number | null; fatiaReal: number | null };
    artes: Arte[];
};

const ETIQUETA: Record<Arte["classe"], { texto: string; cor: string }> = {
    vencedor: { texto: "Vencedor", cor: "bg-green-100 text-green-800 border-green-200" },
    promissor: { texto: "Promissor", cor: "bg-blue-100 text-blue-800 border-blue-200" },
    cansado: { texto: "Cansado", cor: "bg-amber-100 text-amber-900 border-amber-200" },
    "abaixo da meta": { texto: "Abaixo da meta", cor: "bg-orange-100 text-orange-900 border-orange-200" },
    morto: { texto: "Morto", cor: "bg-red-100 text-red-800 border-red-200" },
};

const dinheiro = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function MetaDesempenho() {
    const [dados, setDados] = useState<Resposta | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        api.get<Resposta>("/api/admin/campanhas/meta")
            .then(setDados)
            .catch(() => setDados(null))
            .finally(() => setCarregando(false));
    }, []);

    if (carregando) {
        return <div className="mb-6 rounded-xl border border-gray-200 p-4 text-sm text-gray-500">Carregando gasto da Meta…</div>;
    }
    if (!dados) return null;

    if (!dados.conectada) {
        return (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                <strong className="block text-gray-900">Meta não conectada.</strong>
                {dados.aviso}
            </div>
        );
    }

    const semEtiqueta = dados.artes.find((a) => a.arte === "(sem etiqueta)");

    return (
        <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
                <BadgeDollarSign size={18} className="text-[#8C2F39]" />
                <h2 className="text-lg font-semibold text-gray-900">Meta — gasto x venda, por arte</h2>
            </div>

            {dados.erroDaMeta && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    <strong>Não consegui falar com a Meta.</strong> Os números de venda abaixo continuam
                    válidos; só o gasto está faltando. {dados.erroDaMeta}
                </div>
            )}

            {dados.resumo && dados.regra && (
                <div className="mb-4 grid gap-3 sm:grid-cols-4">
                    <Cartao titulo="Gasto (30 dias)" valor={dinheiro(dados.resumo.gasto30)} />
                    <Cartao titulo="Receita atribuída" valor={dinheiro(dados.resumo.receitaAtribuida)} />
                    <Cartao
                        titulo="Retorno geral"
                        valor={dados.resumo.retornoGeral?.toFixed(1) ?? "—"}
                        rodape={`alvo ${dados.regra.retornoAlvo}`}
                        alerta={(dados.resumo.retornoGeral ?? 0) < dados.regra.retornoAlvo}
                    />
                    <Cartao
                        titulo="Publicidade sobre a receita"
                        valor={dados.resumo.fatiaReal != null ? `${dados.resumo.fatiaReal}%` : "—"}
                        rodape="orçado 5%"
                        alerta={(dados.resumo.fatiaReal ?? 0) > 5}
                    />
                </div>
            )}

            {semEtiqueta && semEtiqueta.gasto30 > 0 && (
                <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <strong>{dinheiro(semEtiqueta.gasto30)} gastos sem etiqueta</strong> — {semEtiqueta.anuncios.length}{" "}
                        anúncio(s) cujo link não carrega <code className="rounded bg-amber-100 px-1">utm_content</code>.
                        Quem clica neles chega na loja sem identificação, e a venda aparece como se a pessoa
                        tivesse digitado o endereço. Enquanto for assim, essa verba é invisível neste relatório.
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Arte</th>
                            <th className="px-4 py-3 text-right">Gasto 30d</th>
                            <th className="px-4 py-3 text-right">Gasto 7d</th>
                            <th className="px-4 py-3 text-right">Cliques</th>
                            <th className="px-4 py-3 text-right">Compras</th>
                            <th className="px-4 py-3 text-right">Receita</th>
                            <th className="px-4 py-3 text-right">Custo/compra</th>
                            <th className="px-4 py-3 text-right">Retorno</th>
                            <th className="px-4 py-3">Situação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dados.artes.map((a) => (
                            <tr key={a.arte} className="align-top">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {a.arte}
                                    <span className="mt-0.5 block text-xs font-normal text-gray-400">
                                        {a.anuncios.length} anúncio(s)
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">{dinheiro(a.gasto30)}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-gray-500">{dinheiro(a.gasto7)}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-gray-500">{a.cliques30}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{a.pedidos30}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{dinheiro(a.receita30)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {a.custoPorCompra != null ? dinheiro(a.custoPorCompra) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                                    {a.retorno != null ? a.retorno.toFixed(1) : "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${ETIQUETA[a.classe].cor}`}>
                                        {ETIQUETA[a.classe].texto}
                                    </span>
                                    <span className="mt-1 block max-w-xs text-xs leading-snug text-gray-500">{a.porque}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {dados.regra && (
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    <strong>Como a situação é decidida:</strong> {dados.regra.explicacao} Arte que passou do
                    orçamento sem vender é <em>Morto</em>; que vendeu no mês mas parou na semana e segue
                    gastando é <em>Cansado</em>; que ainda não chegou ao orçamento é <em>Promissor</em>.
                </p>
            )}
        </section>
    );
}

function Cartao({ titulo, valor, rodape, alerta }: { titulo: string; valor: string; rodape?: string; alerta?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${alerta ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
            <p className={`mt-1 text-xl font-semibold ${alerta ? "text-red-700" : "text-gray-900"}`}>{valor}</p>
            {rodape && <p className="mt-0.5 text-xs text-gray-400">{rodape}</p>}
        </div>
    );
}
