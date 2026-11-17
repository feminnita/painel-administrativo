import { useSearchParams } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { ehAdmin } from "@/auth/papel";
import { useConversas } from "../useConversas";
import { useAtendimento } from "../useAtendimento";
import { ListaConversas } from "./ListaConversas";
import { Chat } from "./Chat";

// Caixa de entrada do WhatsApp da Armmis: todas as conversas, o que a Lia
// respondeu, e a equipe respondendo por aqui. Quem responde abre um atendimento
// (a Lia para naquela conversa); "Fechar" pede o motivo e devolve para a Lia.
// A conversa aberta fica no endereco (?tel=) para o "voltar" do celular funcionar.
export function ConversasPage() {
    const { admin } = useAuth();
    const souAdmin = ehAdmin(admin?.role);
    const { conversas, carregou, erro, carregar } = useConversas(5000);
    const at = useAtendimento();
    const [params, setParams] = useSearchParams();
    const selecionado = params.get("tel");
    const conversa = conversas.find((c) => c.telefone === selecionado) ?? null;

    const abrir = (telefone: string) => setParams({ tel: telefone });
    const fechar = () => setParams({});

    return (
        <div className="flex h-full flex-col">
            {erro && carregou && (
                <p className="border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>
            )}
            <div className="flex min-h-0 flex-1">
                {/* No celular, uma coluna de cada vez: a lista some quando abre uma conversa. */}
                <section className={`w-full border-r bg-white md:flex md:w-80 md:shrink-0 lg:w-96 ${selecionado ? "hidden" : "flex"} flex-col`}>
                    <div className="border-b px-4 py-3">
                        <h1 className="text-lg font-semibold text-[#1A1A1A]">Conversas</h1>
                        <p className="text-xs text-neutral-500">WhatsApp da Armmís · atualiza sozinho</p>
                    </div>
                    <div className="min-h-0 flex-1">
                        {!carregou ? (
                            <p className="p-6 text-center text-sm text-neutral-500">Carregando…</p>
                        ) : (
                            <ListaConversas conversas={conversas} fechados={at.fechados} etiquetas={at.etiquetas} meuNome={admin?.name ?? null} souAdmin={souAdmin}
                                selecionado={selecionado} onSelecionar={abrir} onAbrirFechadas={at.carregarFechados} />
                        )}
                    </div>
                </section>

                <section className={`min-w-0 flex-1 ${selecionado ? "flex" : "hidden md:flex"}`}>
                    {selecionado ? (
                        <Chat key={selecionado} telefone={selecionado} conversa={conversa} etiquetas={at.etiquetas} equipe={at.equipe} souAdmin={souAdmin}
                            onVoltar={fechar} onMudou={carregar}
                            onMarcarEtiquetas={at.marcarEtiquetas} onCriarEtiqueta={at.criarEtiqueta} onExcluirEtiqueta={at.excluirEtiqueta}
                            onFecharAtendimento={async (tel, motivo) => { await at.fechar(tel, motivo); at.carregarFechados(); }}
                            onTransferir={at.transferir} />
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-400">
                            <MessagesSquare size={40} />
                            <p className="text-sm">Escolha uma conversa à esquerda.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
