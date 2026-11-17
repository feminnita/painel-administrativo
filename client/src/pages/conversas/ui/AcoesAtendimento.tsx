import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { ASSUNTOS, MOTIVOS_FECHAMENTO } from "../useAtendimento";
import type { Assunto, Etiqueta } from "../type";

const erroDe = (e: unknown, padrao: string) => (e instanceof ApiError ? e.message : padrao);

function Quadro({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-semibold">{titulo}</h2>
                    <button type="button" onClick={onFechar} aria-label="Fechar"><X size={20} /></button>
                </div>
                <div className="space-y-3 p-4">{children}</div>
            </div>
        </div>
    );
}

// Fechar o atendimento: pede o motivo e devolve a conversa para a Lia.
export function FecharModal({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: (motivo: string) => Promise<void> }) {
    const [motivo, setMotivo] = useState(MOTIVOS_FECHAMENTO[0]);
    const [outro, setOutro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const final = motivo === "Outro" ? outro.trim() : motivo;

    async function confirmar() {
        if (!final || salvando) return;
        setSalvando(true);
        setErro(null);
        try {
            await onConfirmar(final);
            onFechar();
        } catch (e) {
            setErro(erroDe(e, "Não foi possível fechar o atendimento."));
            setSalvando(false);
        }
    }

    return (
        <Quadro titulo="Fechar atendimento" onFechar={onFechar}>
            <p className="text-sm text-neutral-600">A conversa volta para a Lia e sai da fila da equipe.</p>
            {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
            <div className="space-y-1">
                {MOTIVOS_FECHAMENTO.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} /> {m}
                    </label>
                ))}
            </div>
            {motivo === "Outro" && (
                <input value={outro} onChange={(e) => setOutro(e.target.value)} maxLength={60} placeholder="Qual foi o motivo?"
                    className="w-full rounded border px-3 py-2 text-sm" />
            )}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onFechar} className="rounded border px-3 py-2 text-sm">Cancelar</button>
                <button type="button" onClick={confirmar} disabled={!final || salvando}
                    className="rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {salvando ? "Fechando…" : "Fechar atendimento"}
                </button>
            </div>
        </Quadro>
    );
}

type TransferirProps = {
    equipe: string[];
    assuntoAtual: Assunto;
    responsavelAtual: string | null;
    onFechar: () => void;
    onConfirmar: (dados: { responsavel: string; assunto: Assunto; observacao: string }) => Promise<void>;
};

// Transferir: escolhe a pessoa e o assunto; a observacao vira nota interna na conversa.
export function TransferirModal({ equipe, assuntoAtual, responsavelAtual, onFechar, onConfirmar }: TransferirProps) {
    const [responsavel, setResponsavel] = useState(responsavelAtual ?? "");
    const [assunto, setAssunto] = useState<Assunto>(assuntoAtual);
    const [observacao, setObservacao] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    async function confirmar() {
        if (salvando) return;
        setSalvando(true);
        setErro(null);
        try {
            await onConfirmar({ responsavel, assunto, observacao });
            onFechar();
        } catch (e) {
            setErro(erroDe(e, "Não foi possível transferir."));
            setSalvando(false);
        }
    }

    return (
        <Quadro titulo="Transferir atendimento" onFechar={onFechar}>
            {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
            <label className="block text-sm">
                <span className="mb-1 block font-medium">Para quem</span>
                <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
                    <option value="">Sem responsável (qualquer pessoa da equipe)</option>
                    {equipe.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </label>
            <label className="block text-sm">
                <span className="mb-1 block font-medium">Assunto</span>
                <select value={assunto} onChange={(e) => setAssunto(e.target.value as Assunto)} className="w-full rounded border px-3 py-2 text-sm">
                    {ASSUNTOS.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
                </select>
            </label>
            <label className="block text-sm">
                <span className="mb-1 block font-medium">Observação (fica como nota interna)</span>
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={500}
                    placeholder="O que a pessoa precisa saber" className="w-full rounded border px-3 py-2 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onFechar} className="rounded border px-3 py-2 text-sm">Cancelar</button>
                <button type="button" onClick={confirmar} disabled={salvando}
                    className="rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {salvando ? "Transferindo…" : "Transferir"}
                </button>
            </div>
        </Quadro>
    );
}

type EtiquetasProps = {
    etiquetas: Etiqueta[];
    marcadas: number[];
    onFechar: () => void;
    onSalvar: (ids: number[]) => Promise<void>;
    onCriar: (nome: string, cor: string) => Promise<void>;
    onExcluir: (id: number) => Promise<void>;
};

const CORES = ["#8C2F39", "#7C3AED", "#B45309", "#DC2626", "#047857", "#1D4ED8", "#525252"];

// Etiquetas da conversa: marca/desmarca, cria nova e exclui do cadastro.
export function EtiquetasModal({ etiquetas, marcadas, onFechar, onSalvar, onCriar, onExcluir }: EtiquetasProps) {
    const [ids, setIds] = useState<number[]>(marcadas);
    const [nome, setNome] = useState("");
    const [cor, setCor] = useState(CORES[0]);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const alternar = (id: number) => setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

    async function salvar() {
        if (salvando) return;
        setSalvando(true);
        setErro(null);
        try {
            await onSalvar(ids);
            onFechar();
        } catch (e) {
            setErro(erroDe(e, "Não foi possível salvar as etiquetas."));
            setSalvando(false);
        }
    }

    async function criar() {
        if (!nome.trim()) return;
        setErro(null);
        try {
            await onCriar(nome.trim(), cor);
            setNome("");
        } catch (e) {
            setErro(erroDe(e, "Não foi possível criar a etiqueta."));
        }
    }

    async function excluir(e: Etiqueta) {
        if (!window.confirm(`Excluir a etiqueta "${e.nome}" do cadastro? Ela sai de todas as conversas.`)) return;
        try {
            await onExcluir(e.id);
            setIds((l) => l.filter((x) => x !== e.id));
        } catch (er) {
            setErro(erroDe(er, "Não foi possível excluir a etiqueta."));
        }
    }

    return (
        <Quadro titulo="Etiquetas da conversa" onFechar={onFechar}>
            {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
            <ul className="max-h-56 space-y-1 overflow-y-auto">
                {etiquetas.length === 0 && <li className="text-sm text-neutral-500">Nenhuma etiqueta cadastrada.</li>}
                {etiquetas.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 text-sm">
                            <input type="checkbox" checked={ids.includes(e.id)} onChange={() => alternar(e.id)} />
                            <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: e.cor }}>{e.nome}</span>
                        </label>
                        <button type="button" onClick={() => excluir(e)} aria-label={`Excluir a etiqueta ${e.nome}`} className="rounded p-1 text-neutral-400 hover:text-red-600">
                            <Trash2 size={14} />
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex items-center gap-2 border-t pt-3">
                <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Nova etiqueta"
                    className="min-w-0 flex-1 rounded border px-3 py-2 text-sm" />
                <select value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Cor da etiqueta"
                    className="rounded border px-2 py-2 text-sm" style={{ color: cor }}>
                    {CORES.map((c) => <option key={c} value={c} style={{ color: c }}>■ {c}</option>)}
                </select>
                <button type="button" onClick={criar} disabled={!nome.trim()} aria-label="Criar etiqueta"
                    className="rounded border p-2 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"><Plus size={16} /></button>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onFechar} className="rounded border px-3 py-2 text-sm">Cancelar</button>
                <button type="button" onClick={salvar} disabled={salvando}
                    className="rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {salvando ? "Salvando…" : "Salvar"}
                </button>
            </div>
        </Quadro>
    );
}
