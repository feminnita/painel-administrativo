import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { Mensagem } from "./type";

const POR_PAGINA = 50;

const base = (tel: string) => `/api/admin/atendimento/conversas/${tel}`;

// Junta o que ja esta na tela com o que chegou, sem repetir (pelo id). O que ja
// existe e atualizado no lugar (o status muda de "enviada" para "lida").
function juntar(atuais: Mensagem[], chegaram: Mensagem[]) {
    const porId = new Map(atuais.map((m) => [String(m.id), m]));
    const novas: Mensagem[] = [];
    for (const m of chegaram) {
        if (porId.has(String(m.id))) porId.set(String(m.id), m);
        else novas.push(m);
    }
    return [...atuais.map((m) => porId.get(String(m.id))!), ...novas];
}

// Mensagens de UMA conversa: carrega as ultimas, busca as novas a cada 5s,
// traz as antigas quando a pessoa rola para cima e marca como lida ao abrir.
export function useMensagens(telefone: string | null, intervaloMs = 5000) {
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [temAntigas, setTemAntigas] = useState(true);
    const [carregandoAntigas, setCarregandoAntigas] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    // Telefone aberto agora: resposta que chega atrasada de outra conversa e descartada.
    const atual = useRef(telefone);
    atual.current = telefone;

    const marcarLida = useCallback((tel: string) => {
        api.post(`${base(tel)}/lida`).catch(() => undefined);
    }, []);

    const buscarNovas = useCallback(async () => {
        const tel = atual.current;
        if (!tel) return;
        try {
            const r = await api.get<Mensagem[]>(`${base(tel)}/mensagens?limite=${POR_PAGINA}`);
            if (atual.current !== tel || !Array.isArray(r)) return;
            setMensagens((ant) => {
                const juntas = juntar(ant, r);
                // Chegou mensagem da cliente com a conversa aberta: ja esta sendo lida.
                if (juntas.slice(ant.length).some((m) => m.autor === "cliente")) marcarLida(tel);
                return juntas;
            });
            setErro(null);
        } catch (e) {
            if (atual.current === tel) setErro(e instanceof Error ? e.message : "Falha ao carregar as mensagens");
        }
    }, [marcarLida]);

    useEffect(() => {
        setMensagens([]);
        setTemAntigas(true);
        setErro(null);
        if (!telefone) return;
        setCarregando(true);
        api.get<Mensagem[]>(`${base(telefone)}/mensagens?limite=${POR_PAGINA}`)
            .then((r) => {
                if (atual.current !== telefone) return;
                const lista = Array.isArray(r) ? r : [];
                setMensagens(lista);
                setTemAntigas(lista.length >= POR_PAGINA);
                marcarLida(telefone);
            })
            .catch((e) => {
                if (atual.current === telefone) setErro(e instanceof Error ? e.message : "Falha ao carregar as mensagens");
            })
            .finally(() => {
                if (atual.current === telefone) setCarregando(false);
            });
        const t = setInterval(buscarNovas, intervaloMs);
        return () => clearInterval(t);
    }, [telefone, intervaloMs, buscarNovas, marcarLida]);

    const carregarAntigas = useCallback(async () => {
        const tel = atual.current;
        const primeira = mensagens[0];
        if (!tel || !primeira || !temAntigas || carregandoAntigas) return;
        setCarregandoAntigas(true);
        try {
            const r = await api.get<Mensagem[]>(
                `${base(tel)}/mensagens?antes=${encodeURIComponent(String(primeira.id))}&limite=${POR_PAGINA}`,
            );
            if (atual.current !== tel || !Array.isArray(r)) return;
            setMensagens((ant) => {
                const ids = new Set(ant.map((m) => String(m.id)));
                return [...r.filter((m) => !ids.has(String(m.id))), ...ant];
            });
            setTemAntigas(r.length >= POR_PAGINA);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Falha ao carregar mensagens antigas");
        } finally {
            setCarregandoAntigas(false);
        }
    }, [mensagens, temAntigas, carregandoAntigas]);

    const enviarTexto = async (texto: string) => {
        if (!telefone) return;
        await api.post(`/api/admin/atendimento/enviar`, { telefone, texto });
        await buscarNovas();
    };

    const enviarImagem = async (imagem_base64: string, mime: string, legenda?: string) => {
        if (!telefone) return;
        await api.post(`/api/admin/atendimento/enviar`, { telefone, imagem_base64, mime, legenda: legenda || undefined });
        await buscarNovas();
    };

    const devolver = async () => {
        if (!telefone) return;
        await api.post(`${base(telefone)}/devolver`);
    };

    return {
        mensagens, carregando, erro, temAntigas, carregandoAntigas,
        carregarAntigas, enviarTexto, enviarImagem, devolver,
    };
}
