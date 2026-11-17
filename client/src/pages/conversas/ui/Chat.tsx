import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRightLeft, CheckCheck, Tags, UserRound } from "lucide-react";
import { useMensagens } from "../useMensagens";
import { useRapidas } from "../useRapidas";
import { rotuloAssunto } from "../useAtendimento";
import { comEquipe, foraDaJanela, lerData, nomeOuTelefone, telefoneFormatado } from "../formatos";
import type { Assunto, Conversa, Etiqueta, Mensagem } from "../type";
import { Balao } from "./Balao";
import { Composer } from "./Composer";
import { PainelCliente } from "./PainelCliente";
import { RapidasModal } from "./RapidasModal";
import { EtiquetasModal, FecharModal, TransferirModal } from "./AcoesAtendimento";

type Props = {
    telefone: string;
    conversa: Conversa | null;
    etiquetas: Etiqueta[];
    equipe: string[];
    onVoltar: () => void;
    onMudou: () => void;
    onMarcarEtiquetas: (telefone: string, ids: number[]) => Promise<unknown>;
    onCriarEtiqueta: (nome: string, cor: string) => Promise<void>;
    onExcluirEtiqueta: (id: number) => Promise<void>;
    onFecharAtendimento: (telefone: string, motivo: string) => Promise<unknown>;
    onTransferir: (telefone: string, dados: { responsavel?: string; assunto?: Assunto; observacao?: string }) => Promise<unknown>;
};

const telaLarga = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

export function Chat({
    telefone, conversa, etiquetas, equipe, onVoltar, onMudou,
    onMarcarEtiquetas, onCriarEtiqueta, onExcluirEtiqueta, onFecharAtendimento, onTransferir,
}: Props) {
    const {
        mensagens, carregando, erro, temAntigas, carregandoAntigas,
        carregarAntigas, enviarTexto, enviarImagem, enviarNota, enviarArquivo,
    } = useMensagens(telefone);
    const { rapidas, salvar: salvarRapida, excluir: excluirRapida } = useRapidas();
    const [quadro, setQuadro] = useState<"rapidas" | "fechar" | "transferir" | "etiquetas" | null>(null);
    const [respondendo, setRespondendo] = useState<Mensagem | null>(null);
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

    const atendimento = conversa?.atendimento ?? null;
    const pausada = conversa ? comEquipe(conversa) : false;
    const comAEquipe = !!atendimento || pausada;
    const liaPassou = conversa?.motivo_pausa === "passou_humano";
    const marcadas = conversa?.etiquetas ?? [];
    const porId = new Map(mensagens.map((m) => [String(m.id), m]));

    const nome = conversa ? nomeOuTelefone(conversa) : telefoneFormatado(telefone);
    const situacao = atendimento
        ? `Protocolo #${atendimento.protocolo} · ${rotuloAssunto(atendimento.assunto)} · ${atendimento.responsavel ?? "sem responsável"}`
        : pausada ? (liaPassou ? "Lia passou para a equipe" : "Com a equipe (Lia pausada)") : "Com a Lia";

    const botao = "inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-neutral-50";

    return (
        <div className="flex h-full min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
                    <button type="button" onClick={onVoltar} className="text-neutral-600 md:hidden" aria-label="Voltar para a lista">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1A1A1A]">{nome}</p>
                        <p className="truncate text-xs text-neutral-500">{telefoneFormatado(telefone)} · {situacao}</p>
                        {marcadas.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {marcadas.map((e) => (
                                    <span key={e.id} className="rounded px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: e.cor }}>{e.nome}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={() => setQuadro("etiquetas")} className={botao} title="Etiquetas da conversa">
                        <Tags size={16} /> Etiquetas
                    </button>
                    <button type="button" onClick={() => setQuadro("transferir")} className={botao} title="Passar para outra pessoa ou trocar o assunto">
                        <ArrowRightLeft size={16} /> Transferir
                    </button>
                    {comAEquipe && (
                        <button type="button" onClick={() => setQuadro("fechar")} className={botao} title="Fechar o atendimento e devolver para a Lia">
                            <CheckCheck size={16} /> Fechar
                        </button>
                    )}
                    <button type="button" onClick={() => setClienteAberto((v) => !v)} className={`${botao} ${clienteAberto ? "bg-neutral-100" : ""}`}>
                        <UserRound size={16} /> Cliente
                    </button>
                </div>

                <div ref={caixa} onScroll={aoRolar} className="flex-1 space-y-2 overflow-y-auto bg-[#F5F1EE] p-3">
                    {carregandoAntigas && <p className="text-center text-xs text-neutral-500">Carregando mensagens antigas…</p>}
                    {!temAntigas && mensagens.length > 0 && <p className="text-center text-xs text-neutral-400">Início da conversa</p>}
                    {carregando && <p className="text-center text-sm text-neutral-500">Carregando…</p>}
                    {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
                    {!carregando && !erro && mensagens.length === 0 && (
                        <p className="text-center text-sm text-neutral-500">Nenhuma mensagem nesta conversa.</p>
                    )}
                    {mensagens.map((m) => (
                        <Balao key={String(m.id)} m={m} citada={m.resposta_de ? porId.get(String(m.resposta_de)) ?? null : null}
                            onImagemCarregou={imagemCarregou} onResponder={bloqueado ? undefined : setRespondendo} />
                    ))}
                </div>

                <Composer
                    key={telefone}
                    bloqueado={bloqueado}
                    nomeCliente={conversa?.nome ?? null}
                    rapidas={rapidas}
                    respondendo={respondendo}
                    onCancelarResposta={() => setRespondendo(null)}
                    onGerenciarRapidas={() => setQuadro("rapidas")}
                    onEnviarTexto={async (t) => {
                        pertoDoFim.current = true;
                        await enviarTexto(t, respondendo ? Number(respondendo.id) : undefined);
                        setRespondendo(null);
                        onMudou();
                    }}
                    onEnviarNota={async (t) => { pertoDoFim.current = true; await enviarNota(t); onMudou(); }}
                    onEnviarImagem={async (b, mime, leg) => { pertoDoFim.current = true; await enviarImagem(b, mime, leg); onMudou(); }}
                    onEnviarArquivo={async (b, mime, nomeArq, leg) => { pertoDoFim.current = true; await enviarArquivo(b, mime, nomeArq, leg); onMudou(); }}
                />

                {quadro === "rapidas" && (
                    <RapidasModal rapidas={rapidas} onFechar={() => setQuadro(null)} onSalvar={salvarRapida} onExcluir={excluirRapida} />
                )}
                {quadro === "fechar" && (
                    <FecharModal onFechar={() => setQuadro(null)}
                        onConfirmar={async (motivo) => { await onFecharAtendimento(telefone, motivo); onMudou(); }} />
                )}
                {quadro === "transferir" && (
                    <TransferirModal equipe={equipe} assuntoAtual={(atendimento?.assunto as Assunto) ?? "geral"} responsavelAtual={atendimento?.responsavel ?? null}
                        onFechar={() => setQuadro(null)}
                        onConfirmar={async (d) => { pertoDoFim.current = true; await onTransferir(telefone, d); onMudou(); }} />
                )}
                {quadro === "etiquetas" && (
                    <EtiquetasModal etiquetas={etiquetas} marcadas={marcadas.map((e) => e.id)} onFechar={() => setQuadro(null)}
                        onSalvar={async (ids) => { await onMarcarEtiquetas(telefone, ids); onMudou(); }}
                        onCriar={onCriarEtiqueta} onExcluir={onExcluirEtiqueta} />
                )}
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
