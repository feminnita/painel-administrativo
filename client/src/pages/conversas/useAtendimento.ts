import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Assunto, Etiqueta, Fechado } from "./type";

const BASE = "/api/admin/atendimento";

export const ASSUNTOS: { valor: Assunto; rotulo: string }[] = [
    { valor: "geral", rotulo: "Geral" },
    { valor: "financeiro", rotulo: "Financeiro" },
    { valor: "expedicao", rotulo: "Expedição" },
    { valor: "afiliada", rotulo: "Afiliada TikTok" },
];
export const rotuloAssunto = (a: string | null | undefined) => ASSUNTOS.find((x) => x.valor === a)?.rotulo ?? "Geral";

export const MOTIVOS_FECHAMENTO = ["Venda fechada", "Dúvida resolvida", "Sem resposta da cliente", "Não era cliente", "Outro"];

// O que a tela Conversas precisa alem das mensagens: etiquetas cadastradas, quem
// tem login no painel (para transferir) e os atendimentos fechados.
export function useAtendimento() {
    const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
    const [equipe, setEquipe] = useState<string[]>([]);
    const [fechados, setFechados] = useState<Fechado[]>([]);

    const carregarEtiquetas = useCallback(async () => {
        try {
            const r = await api.get<Etiqueta[]>(`${BASE}/etiquetas`);
            if (Array.isArray(r)) setEtiquetas(r);
        } catch { /* sem etiquetas a tela continua funcionando */ }
    }, []);

    const carregarFechados = useCallback(async () => {
        try {
            const r = await api.get<Fechado[]>(`${BASE}/fechados?limite=100`);
            if (Array.isArray(r)) setFechados(r);
        } catch { /* a aba Fechadas fica vazia */ }
    }, []);

    useEffect(() => {
        carregarEtiquetas();
        api.get<{ name: string }[]>("/api/admin/users")
            .then((r) => { if (Array.isArray(r)) setEquipe(r.map((u) => u.name)); })
            .catch(() => undefined);
    }, [carregarEtiquetas]);

    const criarEtiqueta = async (nome: string, cor: string) => {
        await api.post(`${BASE}/etiquetas`, { nome, cor });
        await carregarEtiquetas();
    };
    const excluirEtiqueta = async (id: number) => {
        await api.delete(`${BASE}/etiquetas/${id}`);
        await carregarEtiquetas();
    };
    const marcarEtiquetas = (telefone: string, ids: number[]) => api.put(`${BASE}/conversas/${telefone}/etiquetas`, { ids });
    const fechar = (telefone: string, motivo: string) => api.post(`${BASE}/conversas/${telefone}/fechar`, { motivo });
    const transferir = (telefone: string, dados: { responsavel?: string; assunto?: Assunto; observacao?: string }) =>
        api.post(`${BASE}/conversas/${telefone}/transferir`, dados);

    return { etiquetas, equipe, fechados, carregarFechados, criarEtiqueta, excluirEtiqueta, marcarEtiquetas, fechar, transferir };
}
