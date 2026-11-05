import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Conversa } from "./type";

// Lista de conversas do WhatsApp (vem do sistema de marketing pelo painel).
// Atualiza sozinha: e o que faz a mensagem nova da cliente aparecer na tela.
export function useConversas(intervaloMs = 5000) {
    const [conversas, setConversas] = useState<Conversa[]>([]);
    const [carregou, setCarregou] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            const r = await api.get<Conversa[]>("/api/admin/atendimento/conversas?limite=100");
            setConversas(Array.isArray(r) ? r : []);
            setErro(null);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Falha ao carregar as conversas");
        } finally {
            setCarregou(true);
        }
    }, []);

    useEffect(() => {
        carregar();
        const t = setInterval(carregar, intervaloMs);
        return () => clearInterval(t);
    }, [carregar, intervaloMs]);

    return { conversas, carregou, erro, carregar };
}

// So o total de nao lidas, para o contador do menu. Mais espacado que a tela
// para nao ficar batendo no marketing de qualquer pagina do painel. Falha calada:
// sem o marketing no ar, o menu so fica sem numero.
export function useNaoLidas(intervaloMs = 30000) {
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let vivo = true;
        const carregar = async () => {
            try {
                const r = await api.get<Conversa[]>("/api/admin/atendimento/conversas?limite=100");
                if (vivo && Array.isArray(r)) setTotal(r.reduce((s, c) => s + (Number(c.nao_lidas) || 0), 0));
            } catch {
                // sem marketing, sem contador
            }
        };
        carregar();
        const t = setInterval(carregar, intervaloMs);
        return () => { vivo = false; clearInterval(t); };
    }, [intervaloMs]);

    return total;
}
