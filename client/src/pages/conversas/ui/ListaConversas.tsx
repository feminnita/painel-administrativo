import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { comEquipe, dataHora, horaCurta, nomeOuTelefone, previa, telefoneFormatado } from "../formatos";
import { rotuloAssunto } from "../useAtendimento";
import type { Conversa, Etiqueta, Fechado } from "../type";

type Aba = "equipe" | "lia" | "fechadas";

type Props = {
    conversas: Conversa[];
    fechados: Fechado[];
    etiquetas: Etiqueta[];
    meuNome: string | null;
    selecionado: string | null;
    onSelecionar: (telefone: string) => void;
    onAbrirFechadas: () => void;
};

// Com a equipe = tem atendimento aberto ou a Lia esta pausada nessa conversa.
const naEquipe = (c: Conversa) => !!c.atendimento || comEquipe(c);

// Coluna da esquerda: abas da fila (Aguardando equipe, Com a Lia, Fechadas),
// busca por nome ou telefone e filtros (minhas, nao lidas, etiqueta).
export function ListaConversas({ conversas, fechados, etiquetas, meuNome, selecionado, onSelecionar, onAbrirFechadas }: Props) {
    const [busca, setBusca] = useState("");
    const [aba, setAba] = useState<Aba>("equipe");
    const [soMinhas, setSoMinhas] = useState(false);
    const [soNaoLidas, setSoNaoLidas] = useState(false);
    const [etiqueta, setEtiqueta] = useState(0);

    const totalEquipe = useMemo(() => conversas.filter(naEquipe).length, [conversas]);
    const totalLia = conversas.length - totalEquipe;

    const filtradas = useMemo(() => {
        const q = busca.trim().toLowerCase();
        const digitos = q.replace(/\D/g, "");
        return conversas.filter((c) => {
            if (aba === "equipe" ? !naEquipe(c) : naEquipe(c)) return false;
            if (soMinhas && c.atendimento?.responsavel !== meuNome) return false;
            if (soNaoLidas && !(c.nao_lidas > 0)) return false;
            if (etiqueta && !(c.etiquetas ?? []).some((e) => e.id === etiqueta)) return false;
            if (!q) return true;
            return (c.nome ?? "").toLowerCase().includes(q) || (digitos.length > 0 && c.telefone.includes(digitos));
        });
    }, [conversas, busca, aba, soMinhas, soNaoLidas, etiqueta, meuNome]);

    const fechadosFiltrados = useMemo(() => {
        const q = busca.trim().toLowerCase();
        const digitos = q.replace(/\D/g, "");
        if (!q) return fechados;
        return fechados.filter((f) => (f.nome ?? "").toLowerCase().includes(q) || (digitos.length > 0 && f.telefone.includes(digitos)));
    }, [fechados, busca]);

    const botaoAba = (id: Aba, rotulo: string, total?: number) => (
        <button type="button" onClick={() => { setAba(id); if (id === "fechadas") onAbrirFechadas(); }}
            className={`flex-1 border-b-2 px-2 py-2 text-sm ${aba === id ? "border-[#8C2F39] font-semibold text-[#8C2F39]" : "border-transparent text-neutral-600 hover:text-[#1A1A1A]"}`}>
            {rotulo}{total !== undefined ? ` (${total})` : ""}
        </button>
    );

    const chip = (ativo: boolean, rotulo: string, onClick: () => void) => (
        <button type="button" onClick={onClick} aria-pressed={ativo}
            className={`rounded-full border px-2.5 py-1 text-xs ${ativo ? "border-[#8C2F39] bg-[#F3E8EA] font-semibold text-[#8C2F39]" : "text-neutral-600 hover:bg-neutral-50"}`}>
            {rotulo}
        </button>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex border-b">
                {botaoAba("equipe", "Com a equipe", totalEquipe)}
                {botaoAba("lia", "Com a Lia", totalLia)}
                {botaoAba("fechadas", "Fechadas")}
            </div>
            <div className="space-y-2 border-b p-3">
                <label className="flex items-center gap-2 rounded border bg-white px-3 py-2">
                    <Search size={16} className="text-neutral-400" />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone"
                        className="w-full text-sm outline-none" />
                </label>
                {aba !== "fechadas" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {aba === "equipe" && meuNome && chip(soMinhas, "Minhas", () => setSoMinhas((v) => !v))}
                        {chip(soNaoLidas, "Não lidas", () => setSoNaoLidas((v) => !v))}
                        {etiquetas.length > 0 && (
                            <select value={etiqueta} onChange={(e) => setEtiqueta(Number(e.target.value))} aria-label="Filtrar por etiqueta"
                                className={`rounded-full border px-2 py-1 text-xs ${etiqueta ? "border-[#8C2F39] bg-[#F3E8EA] font-semibold text-[#8C2F39]" : "text-neutral-600"}`}>
                                <option value={0}>Etiqueta: todas</option>
                                {etiquetas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                            </select>
                        )}
                    </div>
                )}
            </div>

            {aba === "fechadas" ? (
                <ul className="flex-1 overflow-y-auto">
                    {fechadosFiltrados.length === 0 && <li className="p-6 text-center text-sm text-neutral-500">Nenhum atendimento fechado.</li>}
                    {fechadosFiltrados.map((f) => (
                        <li key={f.protocolo}>
                            <button type="button" onClick={() => onSelecionar(f.telefone)}
                                className={`flex w-full flex-col gap-0.5 border-b px-3 py-3 text-left ${f.telefone === selecionado ? "bg-[#F3E8EA]" : "bg-white hover:bg-neutral-50"}`}>
                                <div className="flex items-center gap-2">
                                    <span className="flex-1 truncate text-[#1A1A1A]">{f.nome?.trim() || telefoneFormatado(f.telefone)}</span>
                                    <span className="shrink-0 text-xs text-neutral-500">{dataHora(f.fechado_em)}</span>
                                </div>
                                <span className="truncate text-sm text-neutral-600">{f.motivo ?? "Sem motivo"}</span>
                                <span className="text-xs text-neutral-500">
                                    Protocolo #{f.protocolo} · {rotuloAssunto(f.assunto)}{f.fechado_por ? ` · fechado por ${f.fechado_por}` : ""}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="flex-1 overflow-y-auto">
                    {filtradas.length === 0 && (
                        <li className="p-6 text-center text-sm text-neutral-500">
                            {busca || soMinhas || soNaoLidas || etiqueta ? "Nenhuma conversa com esse filtro." : aba === "equipe" ? "Nenhuma conversa esperando a equipe." : "Nenhuma conversa com a Lia."}
                        </li>
                    )}
                    {filtradas.map((c) => {
                        const ativo = c.telefone === selecionado;
                        const liaPassou = c.motivo_pausa === "passou_humano";
                        return (
                            <li key={c.telefone}>
                                <button type="button" onClick={() => onSelecionar(c.telefone)}
                                    className={`flex w-full flex-col gap-1 border-b px-3 py-3 text-left transition-colors ${ativo ? "bg-[#F3E8EA]" : "bg-white hover:bg-neutral-50"}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`flex-1 truncate ${c.nao_lidas > 0 ? "font-semibold text-[#1A1A1A]" : "text-[#1A1A1A]"}`}>
                                            {nomeOuTelefone(c)}
                                        </span>
                                        <span className={`shrink-0 text-xs ${c.nao_lidas > 0 ? "font-semibold text-[#8C2F39]" : "text-neutral-500"}`}>
                                            {horaCurta(c.ultima?.criado_em)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 truncate text-sm text-neutral-500">{previa(c)}</span>
                                        {c.nao_lidas > 0 && (
                                            <span className="shrink-0 rounded-full bg-[#8C2F39] px-2 py-0.5 text-xs font-semibold text-white">{c.nao_lidas}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {naEquipe(c) && (
                                            <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${liaPassou && !c.atendimento?.responsavel ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                                {c.atendimento?.responsavel
                                                    ? `${rotuloAssunto(c.atendimento.assunto)} · ${c.atendimento.responsavel}`
                                                    : liaPassou ? "Lia passou para a equipe" : `${rotuloAssunto(c.atendimento?.assunto)} · sem responsável`}
                                            </span>
                                        )}
                                        {(c.etiquetas ?? []).map((e) => (
                                            <span key={e.id} className="rounded px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: e.cor }}>{e.nome}</span>
                                        ))}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
