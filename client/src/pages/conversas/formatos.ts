import type { Conversa, TipoMensagem } from "./type";

const DIA_MS = 24 * 60 * 60 * 1000;
export const JANELA_WHATSAPP_MS = DIA_MS;

// O marketing manda data como ISO ("2026-11-05T13:00:00Z") ou como
// "2026-11-05 13:00:00" sem fuso. Sem fuso tratamos como UTC, que e como o
// banco de la grava (datetime('now')). Se as horas aparecerem 3h adiantadas,
// e aqui que se ajusta.
export function lerData(valor: string | null | undefined): Date | null {
    if (!valor) return null;
    const s = String(valor).trim();
    const semFuso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s);
    const d = new Date(semFuso ? `${s.replace(" ", "T")}Z` : s);
    return Number.isNaN(d.getTime()) ? null : d;
}

// Hora para a lista e para os baloes: hoje so a hora, ontem "ontem", antes a data.
export function horaCurta(valor: string | null | undefined, agora = new Date()) {
    const d = lerData(valor);
    if (!d) return "";
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    if (d.getTime() >= hoje) return hora;
    if (d.getTime() >= hoje - DIA_MS) return "ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function dataHora(valor: string | null | undefined) {
    const d = lerData(valor);
    return d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
}

// 5522999998888 -> (22) 99999-8888. Numero de fora do Brasil fica como veio.
export function telefoneFormatado(tel: string) {
    const d = tel.replace(/\D/g, "");
    const local = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : null;
    if (!local) return `+${d}`;
    const ddd = local.slice(0, 2);
    const resto = local.slice(2);
    return `(${ddd}) ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}

export function nomeOuTelefone(c: Pick<Conversa, "nome" | "telefone">) {
    return c.nome?.trim() || telefoneFormatado(c.telefone);
}

export const ROTULO_TIPO: Record<TipoMensagem, string> = {
    texto: "",
    imagem: "[foto]",
    audio: "[áudio]",
    documento: "[documento]",
    video: "[vídeo]",
    outro: "[mensagem]",
};

export function previa(c: Conversa) {
    if (!c.ultima) return "";
    const quem = c.ultima.autor === "lia" ? "Lia: " : c.ultima.autor === "equipe" ? "Você: " : "";
    const corpo = c.ultima.tipo === "texto"
        ? c.ultima.texto ?? ""
        : `${ROTULO_TIPO[c.ultima.tipo] ?? "[mensagem]"}${c.ultima.texto ? ` ${c.ultima.texto}` : ""}`;
    return `${quem}${corpo}`;
}

// A Lia esta pausada nessa conversa (a equipe assumiu ou ela passou adiante).
export function comEquipe(c: Pick<Conversa, "pausado_ate">, agora = Date.now()) {
    const ate = lerData(c.pausado_ate);
    return !!ate && ate.getTime() > agora;
}

// Regra do WhatsApp: a empresa so responde ate 24h depois da ultima mensagem da cliente.
export function foraDaJanela(c: Pick<Conversa, "ultima_cliente_em">, agora = Date.now()) {
    const ultima = lerData(c.ultima_cliente_em);
    return !ultima || agora - ultima.getTime() > JANELA_WHATSAPP_MS;
}
