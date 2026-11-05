import { useSearchParams } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { useConversas } from "../useConversas";
import { ListaConversas } from "./ListaConversas";
import { Chat } from "./Chat";

// Caixa de entrada do WhatsApp da Armmis: todas as conversas, o que a Lia
// respondeu, e a equipe respondendo por aqui (texto ou foto). Quem responde
// pausa a Lia naquela conversa; "Devolver para a Lia" libera de novo.
// A conversa aberta fica no endereco (?tel=) para o "voltar" do celular funcionar.
export function ConversasPage() {
    const { conversas, carregou, erro, carregar } = useConversas(5000);
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
                            <ListaConversas conversas={conversas} selecionado={selecionado} onSelecionar={abrir} />
                        )}
                    </div>
                </section>

                <section className={`min-w-0 flex-1 ${selecionado ? "flex" : "hidden md:flex"}`}>
                    {selecionado ? (
                        <Chat key={selecionado} telefone={selecionado} conversa={conversa} onVoltar={fechar} onMudou={carregar} />
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
