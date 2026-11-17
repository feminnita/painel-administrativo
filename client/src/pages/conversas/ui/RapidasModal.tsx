import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type { RespostaRapida } from "../type";

type Props = {
    rapidas: RespostaRapida[];
    onFechar: () => void;
    onSalvar: (chave: string, texto: string, id?: number) => Promise<void>;
    onExcluir: (id: number) => Promise<void>;
};

// Cadastro das mensagens rapidas: o atalho (o que se digita depois da "/") e o texto.
export function RapidasModal({ rapidas, onFechar, onSalvar, onExcluir }: Props) {
    const [editando, setEditando] = useState<RespostaRapida | "nova" | null>(rapidas.length === 0 ? "nova" : null);
    const [chave, setChave] = useState("");
    const [texto, setTexto] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    function abrir(r: RespostaRapida | "nova") {
        setEditando(r);
        setChave(r === "nova" ? "" : r.chave);
        setTexto(r === "nova" ? "" : r.texto);
        setErro(null);
    }

    async function salvar() {
        if (!editando || salvando) return;
        setSalvando(true);
        setErro(null);
        try {
            await onSalvar(chave.trim().toLowerCase(), texto.trim(), editando === "nova" ? undefined : editando.id);
            setEditando(null);
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : "Não foi possível salvar. Tente de novo.");
        } finally {
            setSalvando(false);
        }
    }

    async function excluir(r: RespostaRapida) {
        if (!window.confirm(`Excluir a mensagem rápida /${r.chave}?`)) return;
        try {
            await onExcluir(r.id);
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : "Não foi possível excluir. Tente de novo.");
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Mensagens rápidas">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-semibold">Mensagens rápidas</h2>
                    <button type="button" onClick={onFechar} aria-label="Fechar"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <p className="mb-3 text-sm text-neutral-600">
                        No campo de mensagem, digite <strong>/</strong> e o atalho. No texto, <code>{"{nome}"}</code> vira o primeiro nome da cliente
                        e <code>{"{saudacao}"}</code> vira bom dia, boa tarde ou boa noite.
                    </p>
                    {erro && <p className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}

                    {editando ? (
                        <div className="space-y-3 rounded border p-3">
                            <label className="block text-sm">
                                <span className="mb-1 block font-medium">Atalho</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-neutral-500">/</span>
                                    <input value={chave} onChange={(e) => setChave(e.target.value)} maxLength={40} placeholder="catalogo"
                                        className="w-full rounded border px-3 py-2 text-sm" />
                                </div>
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-medium">Texto</span>
                                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} maxLength={4096}
                                    placeholder="{saudacao}, {nome}! ..." className="w-full rounded border px-3 py-2 text-sm" />
                            </label>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditando(null)} className="rounded border px-3 py-2 text-sm">Cancelar</button>
                                <button type="button" onClick={salvar} disabled={salvando || !chave.trim() || !texto.trim()}
                                    className="rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                                    {salvando ? "Salvando…" : "Salvar"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button type="button" onClick={() => abrir("nova")}
                                className="mb-3 inline-flex items-center gap-1 rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white">
                                <Plus size={16} /> Nova mensagem rápida
                            </button>
                            {rapidas.length === 0 && <p className="text-sm text-neutral-500">Nenhuma mensagem rápida cadastrada.</p>}
                            <ul className="divide-y rounded border">
                                {rapidas.map((r) => (
                                    <li key={r.id} className="flex items-start gap-3 px-3 py-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">/{r.chave}</p>
                                            <p className="whitespace-pre-wrap break-words text-sm text-neutral-600">{r.texto}</p>
                                        </div>
                                        <button type="button" onClick={() => abrir(r)} aria-label={`Editar /${r.chave}`} className="rounded border p-2 text-neutral-600 hover:bg-neutral-50"><Pencil size={14} /></button>
                                        <button type="button" onClick={() => excluir(r)} aria-label={`Excluir /${r.chave}`} className="rounded border p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
