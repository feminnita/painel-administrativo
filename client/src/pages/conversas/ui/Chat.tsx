import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, UserRound } from "lucide-react";
import { useMensagens } from "../useMensagens";
import { comEquipe, foraDaJanela, lerData, nomeOuTelefone, telefoneFormatado } from "../formatos";
import type { Conversa } from "../type";
import { Balao } from "./Balao";
import { Composer } from "./Composer";
import { PainelCliente } from "./PainelCliente";

type Props = {
    telefone: string;
    conversa: Conversa | null;
    onVoltar: () => void;
    onMudou: () => void;
};

const telaLarga = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

export function Chat({ telefone, conversa, onVoltar, onMudou }: Props) {
    const {
        mensagens, carregando, erro, temAntigas, carregandoAntigas,
        carregarAntigas, enviarTexto, enviarImagem, devolver,
    } = useMensagens(telefone);
    const [devolvendo, setDevolvendo] = useState(false);
    const [erroDevolver, setErroDevolver] = useState<string | null>(null);
    // Painel "Cliente": aberto de cara em tela larga; no celular abre como gaveta.
    const [clienteAberto, setClienteAberto] = useState(telaLarga);

    const caixa = useRef<HTMLDivElement>(null);
    const pertoDoFim = useRef(true);
    const alturaAntes = useRef<number | null>(null);
    const telefoneRolado = useRef<string | null>(null);

    // Rolagem: ao abrir vai para o fim; mensagem nova so puxa para o fim se a
    // pessoa ja estava la embaixo; ao trazer as antigas, a tela fica parada no
    // mesmo ponto em vez de pular.
    useLayoutEffect(() => {
        const el = caixa.current;
        if (!el || mensagens.length === 0) return;
        if (alturaAntes.current !== null) {
            el.scrollTop = el.scrollHeight - alturaAntes.current;
            alturaAntes.current = null;
        } else if (telefoneRolado.current !== telefone || pertoDoFim.current) {
            el.scrollTop = el.scrollHeight;
            telefoneRolado.current = telefone;
        }
    }, [mensagens, telefone]);

    function aoRolar() {
        const el = caixa.current;
        if (!el) return;
        pertoDoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (el.scrollTop < 40 && temAntigas && !carregandoAntigas && mensagens.length > 0) {
            alturaAntes.current = el.scrollHeight;
            carregarAntigas();
        }
    }

    function imagemCarregou() {
        const el = caixa.current;
        if (el && pertoDoFim.current) el.scrollTop = el.scrollHeight;
    }

    // A janela de 24h conta da ultima mensagem DA CLIENTE. A lista traz esse
    // horario; se a conversa nao estiver na lista, sai das mensagens carregadas.
    const ultimaDaCliente = [...mensagens].reverse().find((m) => m.autor === "cliente")?.criado_em ?? null;
    const candidatas = [conversa?.ultima_cliente_em, ultimaDaCliente].filter(Boolean) as string[];
    const ultimaClienteEm = candidatas.sort((a, b) => (lerData(b)?.getTime() ?? 0) - (lerData(a)?.getTime() ?? 0))[0] ?? null;
    const bloqueado = !carregando && foraDaJanela({ ultima_cliente_em: ultimaClienteEm });

    const pausada = conversa ? comEquipe(conversa) : false;
    const liaPassou = conversa?.motivo_pausa === "passou_humano";

    async function devolverParaLia() {
        setDevolvendo(true);
        setErroDevolver(null);
        try {
            await devolver();
            onMudou();
        } catch (e) {
            setErroDevolver(e instanceof Error ? e.message : "Não foi possível devolver para a Lia");
        } finally {
            setDevolvendo(false);
        }
    }

    const nome = conversa ? nomeOuTelefone(conversa) : telefoneFormatado(telefone);

    return (
        <div className="flex h-full min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
                    <button type="button" onClick={onVoltar} className="text-neutral-600 md:hidden" aria-label="Voltar para a lista">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1A1A1A]">{nome}</p>
                        <p className="text-xs text-neutral-500">
                            {telefoneFormatado(telefone)}
                            {pausada && (liaPassou ? " · Lia passou para a equipe" : " · Com a equipe (Lia pausada)")}
                        </p>
                    </div>
                    {pausada && (
                        <button type="button" onClick={devolverParaLia} disabled={devolvendo}
                            className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50">
                            <Bot size={16} /> {devolvendo ? "Devolvendo…" : "Devolver para a Lia"}
                        </button>
                    )}
                    <button type="button" onClick={() => setClienteAberto((v) => !v)}
                        className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-neutral-50 ${clienteAberto ? "bg-neutral-100" : ""}`}>
                        <UserRound size={16} /> Cliente
                    </button>
                </div>
                {erroDevolver && <p className="border-b bg-red-50 px-3 py-2 text-sm text-red-700">{erroDevolver}</p>}

                <div ref={caixa} onScroll={aoRolar} className="flex-1 space-y-2 overflow-y-auto bg-[#F5F1EE] p-3">
                    {carregandoAntigas && <p className="text-center text-xs text-neutral-500">Carregando mensagens antigas…</p>}
                    {!temAntigas && mensagens.length > 0 && <p className="text-center text-xs text-neutral-400">Início da conversa</p>}
                    {carregando && <p className="text-center text-sm text-neutral-500">Carregando…</p>}
                    {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
                    {!carregando && !erro && mensagens.length === 0 && (
                        <p className="text-center text-sm text-neutral-500">Nenhuma mensagem nesta conversa.</p>
                    )}
                    {mensagens.map((m) => <Balao key={String(m.id)} m={m} onImagemCarregou={imagemCarregou} />)}
                </div>

                <Composer
                    bloqueado={bloqueado}
                    onEnviarTexto={async (t) => { pertoDoFim.current = true; await enviarTexto(t); onMudou(); }}
                    onEnviarImagem={async (b, mime, leg) => { pertoDoFim.current = true; await enviarImagem(b, mime, leg); onMudou(); }}
                />
            </div>

            {clienteAberto && (
                <>
                    {/* Celular: gaveta por cima da conversa, com fundo escuro para fechar. */}
                    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setClienteAberto(false)} />
                    <aside className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] border-l shadow-xl lg:static lg:z-auto lg:shadow-none">
                        <PainelCliente telefone={telefone} onFechar={() => setClienteAberto(false)} />
                    </aside>
                </>
            )}
        </div>
    );
}
