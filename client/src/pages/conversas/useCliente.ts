import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { ClienteDoTelefone } from "./type";

// Cadastro e ultimos pedidos da cliente da conversa aberta (banco do painel).
// Carrega uma vez por conversa: pedido novo no meio do papo nao e o caso comum.
export function useCliente(telefone: string | null) {
    const [cliente, setCliente] = useState<ClienteDoTelefone | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        setCliente(null);
        setErro(null);
        if (!telefone) return;
        let vivo = true;
        setCarregando(true);
        api.get<{ cliente: ClienteDoTelefone | null }>(`/api/admin/atendimento/cliente/${telefone}`)
            .then((r) => { if (vivo) setCliente(r.cliente); })
            .catch((e) => { if (vivo) setErro(e instanceof Error ? e.message : "Falha ao buscar a cliente"); })
            .finally(() => { if (vivo) setCarregando(false); });
        return () => { vivo = false; };
    }, [telefone]);

    return { cliente, carregando, erro };
}
