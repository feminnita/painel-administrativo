import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";

const TIPOS_FOTO = ["image/jpeg", "image/png"]; // o servidor da Lia (WhatsApp) só aceita JPEG e PNG
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

export const AVISO_24H =
    "Passaram 24 horas da última mensagem da cliente. Pela regra do WhatsApp, só dá para responder depois que ela escrever de novo.";

function lerBase64(arquivo: File) {
    return new Promise<string>((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result).replace(/^data:[^,]*,/, ""));
        leitor.onerror = () => falha(leitor.error);
        leitor.readAsDataURL(arquivo);
    });
}

// O servidor do painel ja traduz o erro do marketing; aqui so garante uma
// frase clara para os casos que a equipe vai encontrar.
function mensagemDeErro(e: unknown) {
    if (e instanceof ApiError) {
        if (e.status === 409) return AVISO_24H;
        if (e.status === 403) return "O WhatsApp da Lia está em modo teste: só manda mensagem para os números liberados.";
        if (e.status === 502 || e.status === 504 || e.status === 503) return `Não foi enviado. ${e.message}`;
        return e.message;
    }
    return "Não foi enviado. Tente de novo.";
}

type Props = {
    bloqueado: boolean;
    onEnviarTexto: (texto: string) => Promise<void>;
    onEnviarImagem: (base64: string, mime: string, legenda?: string) => Promise<void>;
};

// Rodape da conversa: texto (Enter envia, Shift+Enter quebra linha) ou foto
// com previa e legenda opcional.
export function Composer({ bloqueado, onEnviarTexto, onEnviarImagem }: Props) {
    const [texto, setTexto] = useState("");
    const [foto, setFoto] = useState<File | null>(null);
    const [previa, setPrevia] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const seletor = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!foto) { setPrevia(null); return; }
        const u = URL.createObjectURL(foto);
        setPrevia(u);
        return () => URL.revokeObjectURL(u);
    }, [foto]);

    function escolherFoto(arquivo: File | undefined) {
        setErro(null);
        if (!arquivo) return;
        if (!TIPOS_FOTO.includes(arquivo.type)) { setErro("A foto precisa ser JPG, PNG ou WEBP."); return; }
        if (arquivo.size > MAX_FOTO_BYTES) { setErro("Foto grande demais: o limite é 5 MB."); return; }
        setFoto(arquivo);
    }

    async function enviar() {
        if (bloqueado || enviando) return;
        const t = texto.trim();
        if (!foto && !t) return;
        setEnviando(true);
        setErro(null);
        try {
            if (foto) {
                await onEnviarImagem(await lerBase64(foto), foto.type, t || undefined);
                setFoto(null);
            } else {
                await onEnviarTexto(t);
            }
            setTexto("");
        } catch (e) {
            setErro(mensagemDeErro(e));
        } finally {
            setEnviando(false);
        }
    }

    if (bloqueado) {
        return (
            <div className="border-t bg-amber-50 p-3 text-sm text-amber-900">{AVISO_24H}</div>
        );
    }

    return (
        <div className="border-t bg-white p-3">
            {erro && <p className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
            {previa && (
                <div className="relative mb-2 inline-block">
                    <img src={previa} alt="Foto a enviar" className="max-h-40 rounded border" />
                    <button type="button" onClick={() => setFoto(null)} aria-label="Tirar a foto"
                        className="absolute -right-2 -top-2 rounded-full bg-[#1A1A1A] p-1 text-white">
                        <X size={14} />
                    </button>
                </div>
            )}
            <div className="flex items-end gap-2">
                <input ref={seletor} type="file" accept={TIPOS_FOTO.join(",")} className="hidden"
                    onChange={(e) => { escolherFoto(e.target.files?.[0]); e.target.value = ""; }} />
                <button type="button" onClick={() => seletor.current?.click()} disabled={enviando}
                    className="rounded border p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50" aria-label="Anexar foto" title="Anexar foto">
                    <ImagePlus size={20} />
                </button>
                <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            enviar();
                        }
                    }}
                    rows={2}
                    placeholder={foto ? "Legenda (opcional)" : "Escreva a mensagem… (Enter envia, Shift+Enter quebra linha)"}
                    className="min-h-[44px] flex-1 resize-none rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8C2F39]"
                    disabled={enviando}
                />
                <button type="button" onClick={enviar} disabled={enviando || (!foto && !texto.trim())}
                    className="inline-flex items-center gap-1 rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    <Send size={16} /> {enviando ? "Enviando…" : "Enviar"}
                </button>
            </div>
        </div>
    );
}
