import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { Image, Megaphone, ShoppingCart, TrendingUp } from "lucide-react";

// Desempenho de campanha e de ARTE, medido pelas vendas da própria loja.
//
// Não puxa da Meta nem do GA4 de propósito: aqui o número é venda que aconteceu,
// não conversão que a plataforma diz ter feito. E não depende de token que vence
// e deixa a tela em branco sem avisar. Quando ligarmos a Meta, o gasto dela entra
// ao lado da receita daqui e sai o ROAS de verdade por criativo.

type Linha = { pedidos: number; receita: number; ticket?: number };
type Campanha = Linha & { campanha: string; origem: string };
type Arte = Linha & { arte: string; campanha: string };
type Referencia = { de: string; pedidos: number; receita: number };

type Resposta = {
    de: string;
    ate: string;
    resumo: { pedidos: number; receita: number; comOrigem: number; campanhas: number; artes: number };
    campanhas: Campanha[];
    artes: Arte[];
    referencias: Referencia[];
};

const dinheiro = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const hoje = () => new Date().toISOString().slice(0, 10);
const diasAtras = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export function CampanhasPage() {
    const [dados, setDados] = useState<Resposta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [de, setDe] = useState(diasAtras(30));
    const [ate, setAte] = useState(hoje());

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            setDados(await api.get<Resposta>(`/api/admin/campanhas?de=${de}&ate=${ate}`));
        } finally {
            setCarregando(false);
        }
    }, [de, ate]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const r = dados?.resumo;
    const semDado = !carregando && r?.pedidos === 0;
    const semOrigem = !carregando && !!r?.pedidos && r.comOrigem === 0;
    const melhorArte = dados?.artes[0];

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Campanhas</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        De onde vieram as vendas — por campanha e por arte, contando só pedido pago.
                    </p>
                </div>
                <div className="flex items-end gap-2">
                    <Periodo rotulo="De" valor={de} aoMudar={setDe} />
                    <Periodo rotulo="Até" valor={ate} aoMudar={setAte} />
                    <div className="flex gap-1">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => {
                                    setDe(diasAtras(d));
                                    setAte(hoje());
                                }}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs transition-colors hover:bg-gray-50"
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {semOrigem && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                    <strong>Nenhum pedido deste período tem origem registrada.</strong> A loja passou a
                    guardar de onde vem a visita em 07/09/2026 — pedidos anteriores não têm como recuperar.
                    Para uma campanha aparecer aqui, o link do anúncio precisa levar os marcadores. Exemplo:
                    <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-xs">
                        feminnita.com.br/?utm_source=meta&amp;utm_campaign=dia-das-maes&amp;utm_content=arte-03
                    </code>
                </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Cartao icone={<ShoppingCart size={18} />} rotulo="Pedidos pagos" valor={r ? String(r.pedidos) : "—"} />
                <Cartao icone={<TrendingUp size={18} />} rotulo="Receita" valor={r ? dinheiro(r.receita) : "—"} destaque />
                <Cartao icone={<Megaphone size={18} />} rotulo="Campanhas" valor={r ? String(r.campanhas) : "—"} />
                <Cartao icone={<Image size={18} />} rotulo="Artes" valor={r ? String(r.artes) : "—"} />
            </div>

            {melhorArte && (
                <div className="mb-6 rounded-xl border border-[#8C2F39]/30 bg-[#8C2F39]/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-[#8C2F39]">Arte que mais vendeu</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{melhorArte.arte}</p>
                    <p className="text-sm text-gray-600">
                        {melhorArte.pedidos} {melhorArte.pedidos === 1 ? "pedido" : "pedidos"} ·{" "}
                        {dinheiro(melhorArte.receita)} · campanha {melhorArte.campanha}
                    </p>
                </div>
            )}

            <Tabela
                titulo="Por arte"
                subtitulo="É o que responde qual criativo está vendendo"
                colunas={["Arte", "Campanha", "Pedidos", "Receita", "Ticket médio"]}
                vazio={
                    carregando
                        ? "Carregando…"
                        : semDado
                          ? "Nenhum pedido pago neste período."
                          : "Nenhum pedido veio com arte identificada. Use utm_content no link do anúncio."
                }
                linhas={dados?.artes.map((a) => [
                    a.arte,
                    a.campanha,
                    String(a.pedidos),
                    dinheiro(a.receita),
                    dinheiro(a.ticket ?? 0),
                ])}
            />

            <Tabela
                titulo="Por campanha"
                colunas={["Campanha", "Origem", "Pedidos", "Receita", "Ticket médio"]}
                vazio={carregando ? "Carregando…" : "Nenhuma campanha com venda neste período."}
                linhas={dados?.campanhas.map((c) => [
                    c.campanha,
                    c.origem,
                    String(c.pedidos),
                    dinheiro(c.receita),
                    dinheiro(c.ticket ?? 0),
                ])}
            />

            <Tabela
                titulo="Quem veio sem anúncio"
                subtitulo="Vendas que chegaram por link, busca ou digitando o endereço"
                colunas={["Veio de", "Pedidos", "Receita"]}
                vazio={carregando ? "Carregando…" : "Nada neste período."}
                linhas={dados?.referencias.map((f) => [f.de, String(f.pedidos), dinheiro(f.receita)])}
            />
        </div>
    );
}

function Periodo({
    rotulo,
    valor,
    aoMudar,
}: {
    rotulo: string;
    valor: string;
    aoMudar: (v: string) => void;
}) {
    return (
        <label className="text-xs text-gray-500">
            {rotulo}
            <input
                type="date"
                value={valor}
                onChange={(e) => aoMudar(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#8C2F39]"
            />
        </label>
    );
}

function Cartao({
    icone,
    rotulo,
    valor,
    destaque,
}: {
    icone: React.ReactNode;
    rotulo: string;
    valor: string;
    destaque?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                destaque ? "border-[#8C2F39]/30 bg-[#8C2F39]/5" : "border-gray-200 bg-white"
            }`}
        >
            <div className="flex items-center gap-2 text-gray-500">
                {icone}
                <span className="text-xs uppercase tracking-wide">{rotulo}</span>
            </div>
            <p className={`mt-2 text-2xl font-semibold ${destaque ? "text-[#8C2F39]" : "text-gray-900"}`}>
                {valor}
            </p>
        </div>
    );
}

function Tabela({
    titulo,
    subtitulo,
    colunas,
    linhas,
    vazio,
}: {
    titulo: string;
    subtitulo?: string;
    colunas: string[];
    linhas?: string[][];
    vazio: string;
}) {
    return (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="font-medium text-gray-900">{titulo}</h2>
                {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                            {colunas.map((c, i) => (
                                <th key={c} className={`px-4 py-3 font-medium ${i > 1 ? "text-right" : ""}`}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!linhas?.length && (
                            <tr>
                                <td colSpan={colunas.length} className="px-4 py-8 text-center text-gray-400">
                                    {vazio}
                                </td>
                            </tr>
                        )}
                        {linhas?.map((linha, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                {linha.map((celula, j) => (
                                    <td
                                        key={j}
                                        className={`px-4 py-3 ${
                                            j > 1 ? "text-right tabular-nums text-gray-700" : "text-gray-900"
                                        }`}
                                    >
                                        {celula}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
