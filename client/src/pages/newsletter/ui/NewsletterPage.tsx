import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { Download, Mail, Search, UserMinus, Users } from "lucide-react";

// Tela da lista de e-mails. Ela existia só no banco: 1.270 pessoas vindas da
// Tray e quem se inscreve pelo pop-up, sem nenhum lugar para a Chris olhar.
//
// É só leitura e exportação de propósito. Quem entra e quem sai se decide na
// loja (pop-up e link de descadastro) — tirar alguém por dentro do painel seria
// apagar o pedido de saída da pessoa, que é justamente o que não se pode perder.

type Inscrito = {
    id: string;
    email: string;
    name: string | null;
    source: string;
    createdAt: string | null;
    unsubscribedAt: string | null;
};

type Resposta = {
    linhas: Inscrito[];
    total: number;
    pagina: number;
    limite: number;
    resumo: { total: number; ativos: number; sairam: number; ultimos7: number };
    origens: { origem: string; n: number }[];
};

const NOME_DA_ORIGEM: Record<string, string> = {
    popup: "Pop-up da loja",
    tray: "Base antiga (Tray)",
    rodape: "Rodapé",
    checkout: "Checkout",
};

const data = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

export function NewsletterPage() {
    const [dados, setDados] = useState<Resposta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [busca, setBusca] = useState("");
    const [buscaAtiva, setBuscaAtiva] = useState("");
    const [situacao, setSituacao] = useState<"ativos" | "sairam" | "todos">("ativos");
    const [origem, setOrigem] = useState("todas");
    const [pagina, setPagina] = useState(1);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const q = new URLSearchParams({
                situacao,
                origem,
                pagina: String(pagina),
                ...(buscaAtiva ? { busca: buscaAtiva } : {}),
            });
            setDados(await api.get<Resposta>(`/api/admin/newsletter?${q}`));
        } finally {
            setCarregando(false);
        }
    }, [situacao, origem, pagina, buscaAtiva]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    // A exportação precisa do cabeçalho de autenticação, então não dá para usar
    // um link comum: baixa via fetch e entrega o arquivo pelo navegador.
    const exportar = async () => {
        const q = new URLSearchParams({ situacao, origem, ...(buscaAtiva ? { busca: buscaAtiva } : {}) });
        const blob = await api.getBlob(`/api/admin/newsletter/export?${q}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `newsletter-feminnita-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const r = dados?.resumo;
    const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.limite)) : 1;

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Newsletter</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Lista de e-mails da Feminnita — nossa, no nosso banco, sem empresa terceirizada.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={exportar}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#8C2F39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7a2832]"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Cartao icone={<Users size={18} />} rotulo="Recebem e-mail" valor={r?.ativos} destaque />
                <Cartao icone={<Mail size={18} />} rotulo="Total na lista" valor={r?.total} />
                <Cartao icone={<UserMinus size={18} />} rotulo="Pediram para sair" valor={r?.sairam} />
                <Cartao icone={<Mail size={18} />} rotulo="Novos em 7 dias" valor={r?.ultimos7} />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                setPagina(1);
                                setBuscaAtiva(busca.trim());
                            }
                        }}
                        placeholder="Buscar por e-mail ou nome e apertar Enter"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#8C2F39]"
                    />
                </div>

                <select
                    value={situacao}
                    onChange={(e) => {
                        setPagina(1);
                        setSituacao(e.target.value as typeof situacao);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#8C2F39]"
                >
                    <option value="ativos">Recebem e-mail</option>
                    <option value="sairam">Pediram para sair</option>
                    <option value="todos">Todos</option>
                </select>

                <select
                    value={origem}
                    onChange={(e) => {
                        setPagina(1);
                        setOrigem(e.target.value);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#8C2F39]"
                >
                    <option value="todas">Todas as origens</option>
                    {dados?.origens.map((o) => (
                        <option key={o.origem} value={o.origem}>
                            {NOME_DA_ORIGEM[o.origem] ?? o.origem} ({o.n})
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">E-mail</th>
                                <th className="px-4 py-3 font-medium">Nome</th>
                                <th className="px-4 py-3 font-medium">Origem</th>
                                <th className="px-4 py-3 font-medium">Inscrito em</th>
                                <th className="px-4 py-3 font-medium">Situação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {carregando && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                                        Carregando…
                                    </td>
                                </tr>
                            )}
                            {!carregando && !dados?.linhas.length && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                                        Ninguém encontrado com esse filtro.
                                    </td>
                                </tr>
                            )}
                            {!carregando &&
                                dados?.linhas.map((i) => (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-900">{i.email}</td>
                                        <td className="px-4 py-3 text-gray-600">{i.name || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {NOME_DA_ORIGEM[i.source] ?? i.source}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{data(i.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            {i.unsubscribedAt ? (
                                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                                    Saiu em {data(i.unsubscribedAt)}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                                                    Recebe
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {dados && dados.total > dados.limite && (
                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                        <span className="text-gray-500">
                            {dados.total} pessoas · página {dados.pagina} de {totalPaginas}
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={pagina <= 1}
                                onClick={() => setPagina((p) => p - 1)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 transition-colors hover:bg-gray-50 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={pagina >= totalPaginas}
                                onClick={() => setPagina((p) => p + 1)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 transition-colors hover:bg-gray-50 disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
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
    valor?: number;
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
                {valor ?? "—"}
            </p>
        </div>
    );
}
