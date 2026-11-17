import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mic, Paperclip, Send, Settings2, Square, StickyNote, Trash2, X, Zap } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type { Mensagem, RespostaRapida } from "../type";
import { trechoDe } from "./Balao";

const TIPOS_FOTO = ["image/jpeg", "image/png"]; // o servidor da Lia (WhatsApp) só aceita JPEG e PNG
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
// PDF, Office, áudio e vídeo. O servidor do painel corta em 15 MB.
const MAX_ARQUIVO_BYTES = 15 * 1024 * 1024;
const ACEITA =
    "image/jpeg,image/png,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/ogg,audio/mpeg,audio/mp4,audio/aac,video/mp4";

export const AVISO_24H =
    "Passaram 24 horas da última mensagem da cliente. Pela regra do WhatsApp, só dá para responder depois que ela escrever de novo.";

function lerBase64(arquivo: Blob) {
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

function saudacao(agora = new Date()) {
    const h = Number(agora.toLocaleString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// {nome} vira o primeiro nome da cliente e {saudacao} vira bom dia / boa tarde / boa noite.
export function preencherRapida(texto: string, nomeCliente: string | null) {
    const primeiro = (nomeCliente ?? "").trim().split(/\s+/)[0] ?? "";
    return texto
        .replace(/\{saudacao\}/gi, saudacao())
        .replace(/\s*\{nome\}/gi, primeiro ? ` ${primeiro}` : "")
        .trimStart();
}

function tempo(seg: number) {
    return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
}

type Props = {
    bloqueado: boolean;
    nomeCliente: string | null;
    rapidas: RespostaRapida[];
    // Mensagem que esta sendo respondida (citada); so vale para texto.
    respondendo?: Mensagem | null;
    onCancelarResposta?: () => void;
    onGerenciarRapidas: () => void;
    onEnviarTexto: (texto: string) => Promise<void>;
    onEnviarNota: (texto: string) => Promise<void>;
    onEnviarImagem: (base64: string, mime: string, legenda?: string) => Promise<void>;
    onEnviarArquivo: (base64: string, mime: string, nome: string, legenda?: string) => Promise<void>;
};

// Rodape da conversa. Texto (Enter envia, Shift+Enter quebra linha), foto ou
// arquivo com legenda, audio gravado na hora, mensagem rapida com "/" e nota
// interna (amarela: fica so no painel, a cliente nao recebe).
export function Composer({
    bloqueado, nomeCliente, rapidas, respondendo, onCancelarResposta, onGerenciarRapidas,
    onEnviarTexto, onEnviarNota, onEnviarImagem, onEnviarArquivo,
}: Props) {
    const [texto, setTexto] = useState("");
    const [anexo, setAnexo] = useState<File | null>(null);
    const [previa, setPrevia] = useState<string | null>(null);
    const [nota, setNota] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    const [segundos, setSegundos] = useState(0);
    const [audio, setAudio] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [indice, setIndice] = useState(0);
    const seletor = useRef<HTMLInputElement>(null);
    const gravador = useRef<MediaRecorder | null>(null);
    const descartar = useRef(false);
    const campo = useRef<HTMLTextAreaElement>(null);

    const ehFoto = !!anexo && TIPOS_FOTO.includes(anexo.type);
    // Fora da janela de 24h so a nota interna continua valendo (ela nao e enviada).
    const soNota = bloqueado;
    const modoNota = nota || soNota;

    useEffect(() => {
        if (!anexo || !ehFoto) { setPrevia(null); return; }
        const u = URL.createObjectURL(anexo);
        setPrevia(u);
        return () => URL.revokeObjectURL(u);
    }, [anexo, ehFoto]);

    useEffect(() => {
        if (!audio) { setAudioUrl(null); return; }
        const u = URL.createObjectURL(audio);
        setAudioUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [audio]);

    useEffect(() => {
        if (!gravando) return;
        const t = setInterval(() => setSegundos((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, [gravando]);

    // Solta o microfone se a pessoa trocar de conversa no meio da gravacao.
    useEffect(() => () => {
        descartar.current = true;
        if (gravador.current && gravador.current.state !== "inactive") gravador.current.stop();
    }, []);

    // Mensagens rapidas: a lista abre quando o campo comeca com "/".
    const sugestoes = useMemo(() => {
        if (modoNota || anexo || !texto.startsWith("/")) return [];
        const termo = texto.slice(1).toLowerCase().trim();
        return rapidas.filter((r) => r.chave.includes(termo) || r.texto.toLowerCase().includes(termo)).slice(0, 8);
    }, [texto, rapidas, modoNota, anexo]);
    useEffect(() => { setIndice(0); }, [texto]);

    function usarRapida(r: RespostaRapida) {
        setTexto(preencherRapida(r.texto, nomeCliente));
        campo.current?.focus();
    }

    function escolherArquivo(arquivo: File | undefined) {
        setErro(null);
        if (!arquivo) return;
        if (arquivo.type.startsWith("image/")) {
            if (!TIPOS_FOTO.includes(arquivo.type)) { setErro("A foto precisa ser JPG ou PNG."); return; }
            if (arquivo.size > MAX_FOTO_BYTES) { setErro("Foto grande demais: o limite é 5 MB."); return; }
        } else if (arquivo.size > MAX_ARQUIVO_BYTES) {
            setErro("Arquivo grande demais: o limite é 15 MB."); return;
        }
        setAudio(null);
        setAnexo(arquivo);
    }

    async function gravar() {
        setErro(null);
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setErro("Este navegador não grava áudio. Use o Chrome.");
            return;
        }
        try {
            const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
            const g = new MediaRecorder(fluxo);
            const partes: Blob[] = [];
            descartar.current = false;
            g.ondataavailable = (e) => { if (e.data.size > 0) partes.push(e.data); };
            g.onstop = () => {
                fluxo.getTracks().forEach((t) => t.stop());
                setGravando(false);
                if (!descartar.current && partes.length) setAudio(new Blob(partes, { type: g.mimeType || "audio/webm" }));
            };
            gravador.current = g;
            setAnexo(null);
            setAudio(null);
            setSegundos(0);
            setGravando(true);
            g.start();
        } catch {
            setErro("Não consegui usar o microfone. Libere o microfone para o painel no navegador.");
        }
    }

    function pararGravacao(jogarFora: boolean) {
        descartar.current = jogarFora;
        if (gravador.current && gravador.current.state !== "inactive") gravador.current.stop();
    }

    async function enviar() {
        if (enviando || gravando) return;
        const t = texto.trim();
        if (modoNota) {
            if (!t) return;
        } else if (!anexo && !audio && !t) {
            return;
        }
        setEnviando(true);
        setErro(null);
        try {
            if (modoNota) {
                await onEnviarNota(t);
                setNota(false);
            } else if (audio) {
                await onEnviarArquivo(await lerBase64(audio), audio.type || "audio/webm", "audio.webm");
                setAudio(null);
            } else if (anexo && ehFoto) {
                await onEnviarImagem(await lerBase64(anexo), anexo.type, t || undefined);
                setAnexo(null);
            } else if (anexo) {
                await onEnviarArquivo(await lerBase64(anexo), anexo.type, anexo.name, t || undefined);
                setAnexo(null);
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

    const podeEnviar = modoNota ? !!texto.trim() : !!(anexo || audio || texto.trim());
    const placeholder = modoNota
        ? "Nota interna: só a equipe vê, a cliente não recebe."
        : audio ? "Áudio pronto para enviar"
        : anexo ? "Legenda (opcional)"
        : "Escreva a mensagem… (Enter envia, / abre as mensagens rápidas)";

    return (
        <div className={`border-t p-3 ${modoNota ? "bg-amber-50" : "bg-white"}`}>
            {soNota && <p className="mb-2 text-sm text-amber-900">{AVISO_24H} Você ainda pode deixar uma nota interna.</p>}
            {erro && <p className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{erro}</p>}

            {respondendo && !modoNota && !anexo && !audio && (
                <div className="mb-2 flex items-center gap-2 rounded border-l-4 border-[#8C2F39] bg-neutral-100 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate"><strong>Respondendo:</strong> {trechoDe(respondendo)}</span>
                    <button type="button" onClick={onCancelarResposta} aria-label="Cancelar a resposta"><X size={14} /></button>
                </div>
            )}
            {previa && (
                <div className="relative mb-2 inline-block">
                    <img src={previa} alt="Foto a enviar" className="max-h-40 rounded border" />
                    <button type="button" onClick={() => setAnexo(null)} aria-label="Tirar a foto"
                        className="absolute -right-2 -top-2 rounded-full bg-[#1A1A1A] p-1 text-white">
                        <X size={14} />
                    </button>
                </div>
            )}
            {anexo && !ehFoto && (
                <div className="mb-2 inline-flex items-center gap-2 rounded border bg-neutral-50 px-3 py-2 text-sm">
                    <FileText size={16} className="shrink-0" />
                    <span className="max-w-[16rem] truncate">{anexo.name}</span>
                    <span className="text-neutral-500">{(anexo.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" onClick={() => setAnexo(null)} aria-label="Tirar o arquivo"><X size={14} /></button>
                </div>
            )}
            {gravando && (
                <div className="mb-2 flex items-center gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Gravando… {tempo(segundos)}
                    <button type="button" onClick={() => pararGravacao(false)} className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-white">
                        <Square size={12} /> Parar
                    </button>
                    <button type="button" onClick={() => pararGravacao(true)} className="underline">Descartar</button>
                </div>
            )}
            {audioUrl && !gravando && (
                <div className="mb-2 flex items-center gap-2">
                    <audio src={audioUrl} controls className="h-10" />
                    <button type="button" onClick={() => setAudio(null)} aria-label="Descartar o áudio" title="Descartar o áudio"
                        className="rounded border p-2 text-neutral-600 hover:bg-neutral-50"><Trash2 size={16} /></button>
                </div>
            )}

            {sugestoes.length > 0 && (
                <ul className="mb-2 max-h-56 overflow-y-auto rounded border bg-white shadow-sm">
                    {sugestoes.map((r, i) => (
                        <li key={r.id}>
                            <button type="button" onClick={() => usarRapida(r)}
                                className={`block w-full px-3 py-2 text-left text-sm ${i === indice ? "bg-[#F3E8EA]" : "hover:bg-neutral-50"}`}>
                                <span className="font-semibold">/{r.chave}</span>
                                <span className="ml-2 text-neutral-600">{r.texto.length > 90 ? `${r.texto.slice(0, 90)}…` : r.texto}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {!modoNota && !anexo && texto.startsWith("/") && sugestoes.length === 0 && (
                <p className="mb-2 text-xs text-neutral-500">
                    Nenhuma mensagem rápida com esse atalho.{" "}
                    <button type="button" onClick={onGerenciarRapidas} className="underline">Cadastrar</button>
                </p>
            )}

            <div className="flex items-end gap-2">
                <input ref={seletor} type="file" accept={ACEITA} className="hidden"
                    onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} />
                <button type="button" onClick={onGerenciarRapidas} disabled={enviando}
                    className="rounded border p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Cadastrar mensagens rápidas" title="Cadastrar mensagens rápidas">
                    <Settings2 size={20} />
                </button>
                {!soNota && (
                    <>
                        <button type="button" onClick={() => seletor.current?.click()} disabled={enviando || gravando || nota}
                            className="rounded border p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Anexar foto ou arquivo" title="Anexar foto, PDF ou outro arquivo">
                            <Paperclip size={20} />
                        </button>
                        <button type="button" onClick={gravar} disabled={enviando || gravando || nota}
                            className="rounded border p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Gravar áudio" title="Gravar áudio">
                            <Mic size={20} />
                        </button>
                        <button type="button" onClick={() => { setTexto("/"); campo.current?.focus(); }} disabled={enviando || gravando || nota || !!anexo}
                            className="rounded border p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Mensagens rápidas" title="Mensagens rápidas (ou digite /)">
                            <Zap size={20} />
                        </button>
                        <button type="button" onClick={() => { setNota((n) => !n); setAnexo(null); setAudio(null); }} disabled={enviando || gravando}
                            aria-pressed={nota} title="Nota interna: só a equipe vê"
                            className={`rounded border p-2 disabled:opacity-40 ${nota ? "border-amber-500 bg-amber-200 text-amber-900" : "text-neutral-600 hover:bg-neutral-50"}`}
                            aria-label="Nota interna">
                            <StickyNote size={20} />
                        </button>
                    </>
                )}
                <textarea
                    ref={campo}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                        if (sugestoes.length > 0) {
                            if (e.key === "ArrowDown") { e.preventDefault(); setIndice((i) => (i + 1) % sugestoes.length); return; }
                            if (e.key === "ArrowUp") { e.preventDefault(); setIndice((i) => (i - 1 + sugestoes.length) % sugestoes.length); return; }
                            if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) { e.preventDefault(); usarRapida(sugestoes[indice]); return; }
                            if (e.key === "Escape") { setTexto(""); return; }
                        }
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            enviar();
                        }
                    }}
                    rows={2}
                    placeholder={placeholder}
                    className={`min-h-[44px] flex-1 resize-none rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8C2F39] ${modoNota ? "border-amber-400 bg-amber-100" : ""}`}
                    disabled={enviando || (!modoNota && !!audio)}
                />
                <button type="button" onClick={enviar} disabled={enviando || gravando || !podeEnviar}
                    className={`inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${modoNota ? "bg-amber-600" : "bg-[#8C2F39]"}`}>
                    <Send size={16} /> {enviando ? "Enviando…" : modoNota ? "Anotar" : "Enviar"}
                </button>
            </div>
        </div>
    );
}
