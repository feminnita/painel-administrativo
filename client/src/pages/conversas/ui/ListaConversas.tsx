import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { comEquipe, horaCurta, nomeOuTelefone, previa } from "../formatos";
import type { Conversa } from "../type";

type Props = {
    conversas: Conversa[];
    selecionado: string | null;
    onSelecionar: (telefone: string) => void;
};

// Coluna da esquerda: busca por nome ou telefone e a lista de conversas.
export function ListaConversas({ conversas, selecionado, onSelecionar }: Props) {
    const [busca, setBusca] = useState("");

    const filtradas = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return conversas;
        const digitos = q.replace(/\D/g, "");
        return conversas.filter((c) =>
            (c.nome ?? "").toLowerCase().includes(q) || (digitos.length > 0 && c.telefone.includes(digitos)));
    }, [conversas, busca]);

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-3">
                <label className="flex items-center gap-2 rounded border bg-white px-3 py-2">
                    <Search size={16} className="text-neutral-400" />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone"
                        className="w-full text-sm outline-none" />
                </label>
            </div>
            <ul className="flex-1 overflow-y-auto">
                {filtradas.length === 0 && (
                    <li className="p-6 text-center text-sm text-neutral-500">{busca ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}</li>
                )}
                {filtradas.map((c) => {
                    const ativo = c.telefone === selecionado;
                    const pausada = comEquipe(c);
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
                                {pausada && (
                                    <span className={`self-start rounded px-2 py-0.5 text-[11px] font-medium ${liaPassou ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                        {liaPassou ? "Lia passou para a equipe" : "Com a equipe"}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
