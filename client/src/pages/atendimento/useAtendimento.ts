import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type Caso = {
    id: string;
    telefone: string;
    nome: string | null;
    resumo: string;
    ultimaMensagem: string | null;
    criadoEm: string;
    atendidoEm: string | null;
    atendidoPor: string | null;
};

// Fila de clientes que a Lia passou para a equipe. Atualiza sozinha.
export function useAtendimento(intervaloMs = 15000) {
    const [abertos, setAbertos] = useState<Caso[]>([]);
    const [recentes, setRecentes] = useState<Caso[]>([]);
    const [erro, setErro] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            const r = await api.get<{ abertos: Caso[]; recentes: Caso[] }>("/api/admin/atendimento/casos");
            setAbertos(r.abertos);
            setRecentes(r.recentes);
            setErro(null);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Falha ao carregar a fila");
        }
    }, []);

    useEffect(() => {
        carregar();
        const t = setInterval(carregar, intervaloMs);
        return () => clearInterval(t);
    }, [carregar, intervaloMs]);

    const marcarAtendido = async (id: string) => {
        await api.patch(`/api/admin/atendimento/casos/${id}/atendido`, {});
        await carregar();
    };

    return { abertos, recentes, erro, marcarAtendido, carregar };
}
