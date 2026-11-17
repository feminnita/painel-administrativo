import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { RespostaRapida } from "./type";

const ROTA = "/api/admin/atendimento/respostas-rapidas";

// Mensagens rapidas: textos prontos que a equipe chama com "/" no campo de mensagem.
// Ficam guardadas no servidor da Lia; valem para todo mundo que usa o painel.
export function useRapidas() {
    const [rapidas, setRapidas] = useState<RespostaRapida[]>([]);

    const carregar = useCallback(async () => {
        try {
            const r = await api.get<RespostaRapida[]>(ROTA);
            if (Array.isArray(r)) setRapidas(r);
        } catch {
            // Sem as mensagens rapidas a conversa continua funcionando; so nao aparece a lista.
        }
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    const salvar = async (chave: string, texto: string, id?: number) => {
        if (id) await api.put(`${ROTA}/${id}`, { chave, texto });
        else await api.post(ROTA, { chave, texto });
        await carregar();
    };

    const excluir = async (id: number) => {
        await api.delete(`${ROTA}/${id}`);
        await carregar();
    };

    return { rapidas, salvar, excluir };
}
